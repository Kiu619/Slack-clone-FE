import type { QueryClient } from '@tanstack/react-query'

import { applyIncomingDmMessageToConversationsCaches } from '@/lib/conversations-cache'
import { messageKeys } from '@/lib/query-keys'
import type { Message, MessagesPage, User } from '@/lib/types'
import { useMessageStore } from '@/stores/useMessageStore'

export type OutboundSendRow = {
  content: string
  channelId?: string | null
  conversationId?: string | null
  parentId?: string | null
  alsoSendToChannel?: boolean
}

export type OutboundOptimisticContext = {
  targetId: string
  tempId: string
  previousChannelData: unknown
  previousThreadData: unknown
}

function buildTempMessage(
  row: OutboundSendRow,
  workspaceId: string,
  u: User,
): Message {
  const id = `temp-draft-${Date.now()}`
  const alsoSend = row.alsoSendToChannel ?? false
  return {
    id,
    channelId: row.channelId ?? null,
    conversationId: row.conversationId ?? null,
    workspaceId,
    user: {
      id: u.id,
      name: u.name ?? null,
      displayName: u.displayName ?? null,
      avatar: u.avatar ?? null,
      email: u.email ?? '',
    },
    content: row.content,
    type: 'text',
    parentId: row.parentId ?? null,
    alsoSendToChannel: alsoSend,
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    replyParticipantIds: [],
    lastReplyAt: null,
    isPinned: false,
    reactions: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Optimistic giống useSendMessage.onMutate — dùng khi gửi từ trang Drafts / Scheduled. */
export function applyDraftsOutboundOptimistic(
  queryClient: QueryClient,
  workspaceId: string,
  row: OutboundSendRow,
  currentUser: User,
): OutboundOptimisticContext | null {
  const targetId = (row.channelId ?? row.conversationId) as string | undefined
  if (!targetId) return null

  const alsoSend = row.alsoSendToChannel ?? false
  const tempMessage = buildTempMessage(row, workspaceId, currentUser)
  const store = useMessageStore.getState()

  const previousChannelData = queryClient.getQueryData(
    messageKeys.list(targetId),
  )
  const previousThreadData = row.parentId
    ? queryClient.getQueryData(messageKeys.thread(row.parentId))
    : undefined

  if (workspaceId && row.conversationId && !row.channelId) {
    applyIncomingDmMessageToConversationsCaches(
      queryClient,
      workspaceId,
      tempMessage,
    )
  }

  if (!row.parentId || alsoSend) {
    store.addMessage(targetId, tempMessage)
  }
  if (row.parentId && !alsoSend) {
    store.upsertEntities([tempMessage])
  }

  if (targetId && (!row.parentId || alsoSend)) {
    queryClient.setQueryData(
      messageKeys.list(targetId),
      (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
        if (!old?.pages.length) return old
        const firstPage = old.pages[0]
        if (firstPage.messages.some((m) => m.id === tempMessage.id)) return old
        return {
          ...old,
          pages: [
            { ...firstPage, messages: [tempMessage, ...firstPage.messages] },
            ...old.pages.slice(1),
          ],
        }
      },
    )
  }

  if (row.parentId) {
    queryClient.setQueryData(
      messageKeys.thread(row.parentId),
      (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
        const current = old || { pages: [], pageParams: [] }
        const pages =
          current.pages.length > 0
            ? current.pages
            : [{ messages: [], nextCursor: null, hasMore: false }]
        const firstPage = pages[0]
        if (firstPage.messages.some((m) => m.id === tempMessage.id)) return old
        return {
          ...current,
          pages: [
            { ...firstPage, messages: [tempMessage, ...firstPage.messages] },
            ...pages.slice(1),
          ],
        }
      },
    )
  }

  return {
    targetId,
    tempId: tempMessage.id,
    previousChannelData,
    previousThreadData,
  }
}

export function finalizeDraftsOutboundOptimistic(
  queryClient: QueryClient,
  workspaceId: string,
  row: OutboundSendRow,
  newMessage: Message,
  ctx: OutboundOptimisticContext | null,
): void {
  if (!ctx) return

  const store = useMessageStore.getState()
  const alsoSend = row.alsoSendToChannel ?? false
  const actualTargetId = newMessage.channelId ?? newMessage.conversationId
  const tempId = ctx.tempId

  if (actualTargetId && (!row.parentId || alsoSend)) {
    if (tempId && tempId !== newMessage.id) {
      store.finalizePendingMessage(actualTargetId, tempId, newMessage)
    } else {
      store.updateMessage(actualTargetId, tempId || newMessage.id, newMessage)
    }
  }
  if (row.parentId && actualTargetId && !alsoSend) {
    if (tempId && tempId !== newMessage.id) {
      store.finalizePendingMessage(actualTargetId, tempId, newMessage)
    } else {
      store.upsertEntities([newMessage])
    }
  }

  if (actualTargetId && (!row.parentId || alsoSend)) {
    queryClient.setQueryData(
      messageKeys.list(actualTargetId),
      (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === tempId || (m.id === newMessage.id && m !== newMessage)
                ? newMessage
                : m,
            ),
          })),
        }
      },
    )
  }

  if (row.parentId) {
    queryClient.setQueryData(
      messageKeys.thread(row.parentId),
      (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === tempId || (m.id === newMessage.id && m !== newMessage)
                ? newMessage
                : m,
            ),
          })),
        }
      },
    )

    queryClient.setQueriesData(
      {
        predicate: (query) =>
          query.queryKey[0] === 'workspaces' &&
          query.queryKey[2] === 'threads',
      },
      (old: unknown) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old
        const o = old as { pages: unknown[] }
        if (!o.pages) return old
        return {
          ...o,
          pages: o.pages.map((page: unknown) => {
            if (!page || typeof page !== 'object' || !('threads' in page))
              return page
            const p = page as {
              threads: Array<{
                id: string
                replies: Message[]
              }>
            }
            if (!p.threads) return page
            return {
              ...p,
              threads: p.threads.map((t) => {
                if (t.id !== row.parentId) return t
                return {
                  ...t,
                  replies: t.replies.map((r) =>
                    r.id === tempId ? newMessage : r,
                  ),
                }
              }),
            }
          }),
        }
      },
    )
  }

  const wsId =
    typeof newMessage.workspaceId === 'string'
      ? newMessage.workspaceId
      : workspaceId
  if (wsId && newMessage.conversationId) {
    applyIncomingDmMessageToConversationsCaches(
      queryClient,
      wsId,
      newMessage,
    )
  }
}

export function rollbackDraftsOutboundOptimistic(
  queryClient: QueryClient,
  workspaceId: string,
  row: OutboundSendRow,
  ctx: OutboundOptimisticContext | null,
): void {
  if (!ctx) return

  const { targetId, tempId, previousChannelData, previousThreadData } = ctx
  const store = useMessageStore.getState()

  if (previousChannelData !== undefined) {
    queryClient.setQueryData(messageKeys.list(targetId), previousChannelData)
  } else {
    void queryClient.invalidateQueries({ queryKey: messageKeys.list(targetId) })
  }

  if (row.parentId) {
    if (previousThreadData !== undefined) {
      queryClient.setQueryData(
        messageKeys.thread(row.parentId),
        previousThreadData,
      )
    } else {
      void queryClient.invalidateQueries({
        queryKey: messageKeys.thread(row.parentId),
      })
    }
  }

  store.removeMessage(targetId, tempId)

  if (workspaceId && row.conversationId && !row.channelId) {
    void queryClient.invalidateQueries({
      queryKey: messageKeys.conversations(workspaceId),
    })
  }
}
