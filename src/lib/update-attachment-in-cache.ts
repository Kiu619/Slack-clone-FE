/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryClient } from "@tanstack/react-query"
import type {
  Message,
  MessageAttachment,
  MessagesPage,
  ThreadMessage,
  ThreadsPage,
} from "@/lib/types"
import { messageKeys } from "@/lib/query-keys"
import { useMessageStore } from "@/stores/useMessageStore"

/**
 * Match descriptor cho attachment cần patch trong cache.
 * - uploadId: match placeholder attachment (khi client đang upload optimistic).
 * - attachmentId: match attachment thật (khi retry upload).
 * - pendingUploadId: match theo client-generated uploadId (đồng bộ với server schema).
 * Ưu tiên uploadId trước; nếu không có thì dùng pendingUploadId; cuối cùng dùng attachmentId.
 */
export type AttachmentMatch = {
  uploadId?: string
  attachmentId?: string
  pendingUploadId?: string
}

/**
 * Áp dụng patch cho attachment trong 1 message.
 * Trả về attachment mới (đã patch) hoặc null nếu xoá.
 */
export type AttachmentPatch =
  | Partial<MessageAttachment>
  | ((a: MessageAttachment) => MessageAttachment | null | undefined)

const applyPatch = (
  att: MessageAttachment,
  patch: AttachmentPatch,
): MessageAttachment | null => {
  if (typeof patch === "function") {
    const result = patch(att)
    return (result ?? null) as MessageAttachment | null
  }
  // Spread trả về object mới — cast type MessageAttachment.
  return { ...att, ...patch } as unknown as MessageAttachment
}

const matchesAttachment = (
  att: MessageAttachment,
  match: AttachmentMatch,
): boolean => {
  if (match.uploadId && att.uploadId === match.uploadId) return true
  if (match.pendingUploadId && att.pendingUploadId === match.pendingUploadId)
    return true
  if (match.attachmentId && att.id === match.attachmentId) return true
  return false
}

/** Transform 1 page của channel/thread list (shape giống nhau). */
const transformMessagesPage = (
  page: MessagesPage | undefined,
  match: AttachmentMatch,
  patch: AttachmentPatch,
): MessagesPage | undefined => {
  if (!page) return page
  let changed = false
  const messages = page.messages.map((m: Message) => {
    if (!m.attachments?.length) return m
    let msgChanged = false
    const nextAttachments = m.attachments
      .map((a) => {
        if (!matchesAttachment(a, match)) return a
        const next = applyPatch(a, patch)
        msgChanged = true
        return next
      })
      .filter((a): a is MessageAttachment => a !== null)
    if (!msgChanged) return m
    changed = true
    return { ...m, attachments: nextAttachments }
  })
  if (!changed) return page
  return { ...page, messages }
}

/** Transform 1 page của Threads Page cache (snippet + replies). */
const transformThreadsPage = (
  page: ThreadsPage | undefined,
  match: AttachmentMatch,
  patch: AttachmentPatch,
): ThreadsPage | undefined => {
  if (!page) return page
  let changed = false
  const threads = page.threads.map((t: ThreadMessage) => {
    let tChanged = false

    const nextThreadAttachments = (t.attachments ?? [])
      .map((a) => {
        if (!matchesAttachment(a, match)) return a
        tChanged = true
        return applyPatch(a, patch)
      })
      .filter((a): a is MessageAttachment => a !== null)

    const nextReplies = (t.replies ?? []).map((r: Message) => {
      if (!r.attachments?.length) return r
      let rChanged = false
      const nextAttachments = r.attachments
        .map((a) => {
          if (!matchesAttachment(a, match)) return a
          rChanged = true
          return applyPatch(a, patch)
        })
        .filter((a): a is MessageAttachment => a !== null)
      if (!rChanged) return r
      tChanged = true
      return { ...r, attachments: nextAttachments }
    })

    if (!tChanged) return t
    changed = true
    return {
      ...t,
      attachments: nextThreadAttachments,
      replies: nextReplies,
    }
  })
  if (!changed) return page
  return { ...page, threads }
}

/**
 * Patch (hoặc xoá) 1 attachment trong tất cả message cache (channel list + thread + threads page)
 * + Zustand store.
 *
 * Dùng cho luồng optimistic upload:
 * - Sau khi upload 1 file xong: patch attachment (xoá uploadStatus, gắn url/id thật).
 * - Khi upload fail: patch attachment với uploadStatus = 'failed'.
 * - Khi retry: patch attachment với uploadStatus = 'uploading'.
 */
export function updateAttachmentInMessageCache(
  queryClient: QueryClient,
  match: AttachmentMatch,
  patch: AttachmentPatch,
  workspaceId?: string,
): void {
  // 1. Channel/DM list cache: queryKey có dạng ['messages', targetId]
  queryClient.setQueriesData(
    { queryKey: messageKeys.all },
    (old: any) => {
      if (!old?.pages?.length) return old
      let changed = false
      const pages = old.pages.map((p: MessagesPage) => {
        const next = transformMessagesPage(p, match, patch)
        if (next !== p) {
          changed = true
          return next
        }
        return p
      })
      if (!changed) return old
      return { ...old, pages }
    },
  )

  // 2. Thread list cache: queryKey có dạng ['thread-messages', parentId]
  queryClient.setQueriesData(
    { queryKey: messageKeys.threadsAll },
    (old: any) => {
      if (!old?.pages?.length) return old
      let changed = false
      const pages = old.pages.map((p: MessagesPage) => {
        const next = transformMessagesPage(p, match, patch)
        if (next !== p) {
          changed = true
          return next
        }
        return p
      })
      if (!changed) return old
      return { ...old, pages }
    },
  )

  // 3. Threads page cache (workspace)
  if (workspaceId) {
    queryClient.setQueryData(
      messageKeys.threads(workspaceId),
      (old: any) => {
        if (!old?.pages?.length) return old
        let changed = false
        const pages = old.pages.map((p: ThreadsPage) => {
          const next = transformThreadsPage(p, match, patch)
          if (next !== p) {
            changed = true
            return next
          }
          return p
        })
        if (!changed) return old
        return { ...old, pages }
      },
    )
  }

  // 4. Zustand store (entities + channels list)
  const store = useMessageStore.getState()
  const targetMessages = new Set<string>()
  for (const [msgId, msg] of Object.entries(store.entities)) {
    if (msg.attachments?.some((a) => matchesAttachment(a, match))) {
      targetMessages.add(msgId)
    }
  }
  for (const messageId of targetMessages) {
    const entity = store.entities[messageId]
    if (!entity?.attachments) continue
    const nextAttachments = entity.attachments
      .map((a) => {
        if (!matchesAttachment(a, match)) return a
        return applyPatch(a, patch)
      })
      .filter((a): a is MessageAttachment => a !== null)
    store.updateEntity(messageId, { attachments: nextAttachments })
  }
}

/**
 * Tìm 1 attachment trong message theo match — dùng khi retry cần biết file gốc.
 */
export function findAttachmentInEntity(
  message: Message | undefined,
  match: AttachmentMatch,
): MessageAttachment | undefined {
  if (!message?.attachments) return undefined
  return message.attachments.find((a) => matchesAttachment(a, match))
}
