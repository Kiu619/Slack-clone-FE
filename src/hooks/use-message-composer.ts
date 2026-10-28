/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAppTranslation } from '@/hooks/use-translation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getWorkspaceProfileApi } from '@/apis'
import { useSendMessage } from '@/hooks/use-messages'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useFinalizeAttachment } from '@/hooks/use-finalize-attachment'
import { usePendingDraftNavigationStore } from '@/stores/usePendingDraftNavigationStore'
import { authKeys, draftKeys, messageKeys, scheduledMessageKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/axios'
import { inferAttachmentTypeFromMime } from '@/lib/attachment-type'
import { updateAttachmentInMessageCache } from '@/lib/update-attachment-in-cache'
import { addPendingUploadEntry } from '@/lib/pending-upload-storage'
import { usePathname, useRouter } from 'next/navigation'
import type { Message, DirectMessageConversation, User, MessageAttachment } from '@/lib/types'
import { openDmInWorkspace } from '@/lib/open-dm-in-workspace'
import {
  buildMessageDraftContextKey,
  MESSAGE_DRAFT_RESTORE_SESSION_KEY,
  previewPlainFromDraftHtml,
} from '@/lib/message-drafts'
import {
  deleteMessageDraftApi,
  fetchMessageDraftCurrent,
  persistMessageDraftWithCache,
  replaceMessageDraftInCaches,
} from '@/lib/message-drafts-api'
import {
  createScheduledMessageApi,
  fetchScheduledMessagesList,
  type ScheduledMessageRow,
} from '@/lib/scheduled-messages-api'

export type ScheduledSendAck = {
  scheduledAtIso: string
  pendingScheduledCount: number
}

/** Tin pending khớp composer hiện tại (cùng kênh/DM, thread hoặc timeline chính). */
const filterScheduledRowsForComposer = (
  rows: ScheduledMessageRow[],
  opts: {
    channelId?: string
    conversationId?: string
    parentId?: string
  },
): ScheduledMessageRow[] => {
  const { channelId, conversationId, parentId } = opts

  if (parentId) {
    if (channelId) {
      return rows.filter(
        (r) => r.parentId === parentId && r.channelId === channelId,
      )
    }
    if (conversationId) {
      return rows.filter(
        (r) =>
          r.parentId === parentId && r.conversationId === conversationId,
      )
    }
    return []
  }

  const isMainTimeline = (r: ScheduledMessageRow) =>
    r.parentId == null || r.parentId === ''

  if (channelId) {
    return rows.filter((r) => r.channelId === channelId && isMainTimeline(r))
  }
  if (conversationId) {
    return rows.filter(
      (r) => r.conversationId === conversationId && isMainTimeline(r),
    )
  }

  return []
}

export interface PendingFile {
  id: string
  file: File
}

interface UseMessageComposerProps {
  workspaceId: string
  channelId?: string
  conversationId?: string
  parentId?: string
  currentConversationData?: DirectMessageConversation
  isNewMessageMode?: boolean
}

export function useMessageComposer({
  workspaceId,
  channelId,
  conversationId,
  parentId,
  currentConversationData,
  isNewMessageMode = false,
}: UseMessageComposerProps) {
  const t = useAppTranslation('messageComposer')
  const queryClient = useQueryClient()
  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(workspaceId),
    queryFn: () => getWorkspaceProfileApi(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
  })
  const currentUser = workspaceProfile as User | undefined
  const router = useRouter()
  const pathname = usePathname()
  const draftUserId = currentUser?.id

  const draftContextKey = useMemo(
    () =>
      buildMessageDraftContextKey({
        workspaceId,
        channelId: channelId ?? null,
        conversationId: conversationId ?? null,
        parentId: parentId ?? null,
        isNewMessageMode,
      }),
    [
      workspaceId,
      channelId,
      conversationId,
      parentId,
      isNewMessageMode,
    ],
  )

  const composerScheduledQueryEnabled =
    !!workspaceId &&
    !!draftUserId &&
    (!!parentId || !!channelId || !!conversationId)

  const { data: pendingScheduledRows = [] } = useQuery({
    queryKey: scheduledMessageKeys.list(workspaceId, 'pending'),
    queryFn: () => fetchScheduledMessagesList(workspaceId, 'pending'),
    enabled: composerScheduledQueryEnabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const scheduledSendAck = useMemo((): ScheduledSendAck | null => {
    if (!composerScheduledQueryEnabled) return null
    const matched = filterScheduledRowsForComposer(pendingScheduledRows, {
      channelId,
      conversationId,
      parentId,
    })
    const n = matched.length
    if (n === 0) return null
    const sorted = [...matched].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    return {
      pendingScheduledCount: n,
      scheduledAtIso: sorted[0].scheduledAt,
    }
  }, [
    composerScheduledQueryEnabled,
    pendingScheduledRows,
    channelId,
    conversationId,
    parentId,
  ])

  const htmlBufferRef = useRef('')
  const dirtyRef = useRef(false)
  const skipNextServerHydrateRef = useRef(false)

  const [composerInitialHtml, setComposerInitialHtml] = useState('')
  const [composerRemountNonce, setComposerRemountNonce] = useState(0)

  const draftQueryEnabled =
    !!workspaceId && !!draftUserId && !!draftContextKey
  const { data: serverDraft, status: draftQueryStatus } = useQuery({
    queryKey: draftKeys.current(workspaceId, draftContextKey),
    queryFn: () => fetchMessageDraftCurrent(workspaceId, draftContextKey),
    enabled: draftQueryEnabled,
    staleTime: 30_000,
  })
  const draftFetchSettled =
    draftQueryEnabled && draftQueryStatus === 'success'

  const applyHtmlToComposer = useCallback((html: string, markDirty: boolean) => {
    setComposerInitialHtml(html)
    htmlBufferRef.current = html
    dirtyRef.current = markDirty
    setComposerRemountNonce((n) => n + 1)
  }, [])

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const navigated =
        usePendingDraftNavigationStore.getState().consumeIfMatch(
          workspaceId,
          draftContextKey,
        )
      if (navigated !== null) {
        skipNextServerHydrateRef.current = true
        applyHtmlToComposer(navigated, true)
        return
      }

      const raw = sessionStorage.getItem(MESSAGE_DRAFT_RESTORE_SESSION_KEY)
      if (raw) {
        try {
          const p = JSON.parse(raw) as { contextKey: string; html: string }
          if (p.contextKey === draftContextKey) {
            sessionStorage.removeItem(MESSAGE_DRAFT_RESTORE_SESSION_KEY)
            const html = typeof p.html === 'string' ? p.html : ''
            skipNextServerHydrateRef.current = true
            applyHtmlToComposer(html, true)
            return
          }
        } catch {
          /* noop */
        }
      }
    }

    skipNextServerHydrateRef.current = false
    applyHtmlToComposer('', false)
  }, [draftContextKey, workspaceId, applyHtmlToComposer])

  useEffect(() => {
    if (skipNextServerHydrateRef.current) {
      skipNextServerHydrateRef.current = false
      return
    }
    if (dirtyRef.current) return
    if (!draftFetchSettled) return
    const content = serverDraft?.content ?? ''
    setComposerInitialHtml(content)
    htmlBufferRef.current = content
    setComposerRemountNonce((n) => n + 1)
  }, [
    draftFetchSettled,
    serverDraft?.id,
    serverDraft?.updatedAt,
    serverDraft?.content,
  ])

  useEffect(() => {
    if (!workspaceId || !draftUserId || !draftContextKey) return
    const keyAtEffect = draftContextKey
    const ws = workspaceId
    return () => {
      if (!dirtyRef.current) return
      const hadPendingFiles = pendingFilesRef.current.length > 0
      dirtyRef.current = false
      void (async () => {
        try {
          await persistMessageDraftWithCache(
            queryClient,
            ws,
            keyAtEffect,
            htmlBufferRef.current,
          )
          if (hadPendingFiles) {
            toast.info(t('pendingFilesNotSavedToDraft'))
          }
        } catch {
          /* offline / 403 */
        }
      })()
    }
  }, [draftContextKey, workspaceId, draftUserId, queryClient, t])

  const clearCurrentDraft = useCallback(async () => {
    if (!workspaceId || !draftContextKey) return
    try {
      await deleteMessageDraftApi(workspaceId, draftContextKey)
      replaceMessageDraftInCaches(
        queryClient,
        workspaceId,
        draftContextKey,
        null,
      )
    } catch {
      /* noop */
    }
    dirtyRef.current = false
    htmlBufferRef.current = ''
  }, [workspaceId, draftContextKey, queryClient])

  const onComposerHtmlChange = useCallback((html: string) => {
    if (html === htmlBufferRef.current) return
    const prevPlain = previewPlainFromDraftHtml(htmlBufferRef.current, 50_000)
    const nextPlain = previewPlainFromDraftHtml(html, 50_000)
    htmlBufferRef.current = html
    if (prevPlain === nextPlain) return
    dirtyRef.current = true
  }, [])

  const target = channelId
    ? { channelId }
    : conversationId
      ? { conversationId }
      : { workspaceId }

  const targetId = (channelId || conversationId) as string

  const currentUserForMutation = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name ?? null,
        displayName: currentUser.displayName ?? null,
        email: currentUser.email,
        avatar: currentUser.avatar ?? null,
      }
    : null

  const { mutate: sendMessage, isPending: isSending } = useSendMessage(
    target,
    currentUserForMutation,
    workspaceId,
  )

  const { uploadFileBinary, uploadingFiles, clearUploadingFiles } =
    useFileUpload()
  const { finalize: finalizeAttachment } = useFinalizeAttachment()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const pendingFilesRef = useRef<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])

  const addPendingFiles = useCallback((files: File[]) => {
    const accepted: PendingFile[] = []
    const rejected: { name: string; reason: 'size' | 'extension' }[] = []

    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push({ name: file.name, reason: 'size' })
        continue
      }
      if (!file.type && !file.name.match(/\.[a-z0-9]+$/i)) {
        rejected.push({ name: file.name, reason: 'extension' })
        continue
      }
      accepted.push({
        id: Math.random().toString(36).substring(7),
        file,
      })
    }

    // Hiện toast cho từng file bị reject (validation sớm → user biết ngay).
    for (const r of rejected) {
      if (r.reason === 'size') {
        toast.error(t('fileTooLarge', { name: r.name }))
      } else {
        toast.error(t('unsupportedFileType', { name: r.name }))
      }
    }

    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted])
    }
  }, [t])

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearPendingFiles = useCallback(() => setPendingFiles([]), [])

  const updateMessageContent = useCallback(
    async (messageId: string, content: string) => {
      const updateCache = (old: any, isThreadList = false) => {
        if (!old?.pages?.length) return old
        if (isThreadList) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads.map((t: any) => {
                if (t.id === messageId) return { ...t, content }
                return {
                  ...t,
                  replies: t.replies.map((r: any) =>
                    r.id === messageId ? { ...r, content } : r,
                  ),
                }
              }),
            })),
          }
        }
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === messageId ? { ...m, content } : m,
            ),
          })),
        }
      }

      try {
        await apiClient.patch<Message>(
          `/messages/${messageId}`,
          { content },
        )

        if (parentId)
          queryClient.setQueryData(
            messageKeys.thread(parentId),
            (old: any) => updateCache(old),
          )
        queryClient.setQueryData(
          messageKeys.threads(workspaceId),
          (old: any) => updateCache(old, true),
        )
        if (targetId)
          queryClient.setQueryData(
            messageKeys.list(targetId),
            (old: any) => updateCache(old),
          )
      } catch {
        if (parentId)
          queryClient.setQueryData(
            messageKeys.thread(parentId),
            (old: any) => updateCache(old),
          )
        queryClient.setQueryData(
          messageKeys.threads(workspaceId),
          (old: any) => updateCache(old, true),
        )
        if (targetId)
          queryClient.setQueryData(
            messageKeys.list(targetId),
            (old: any) => updateCache(old),
          )
      }
    },
    [queryClient, targetId, parentId, workspaceId],
  )

  const scheduleMessage = useCallback(
    async (opts: {
      scheduledAtIso: string
      alsoSendToChannel?: boolean
    }) => {
      const targetKey = channelId ?? conversationId
      if (!targetKey) {
        toast.error(t('selectChannelOrConversationFirst'))
        return
      }
      if (pendingFiles.length > 0) {
        toast.error(t('scheduleWithAttachmentsNotSupported'))
        return
      }
      const html = htmlBufferRef.current
      const plain = previewPlainFromDraftHtml(html, 50_000).trim()
      if (!plain) {
        toast.error(t('messageContentRequired'))
        return
      }
      setIsScheduling(true)
      try {
        await createScheduledMessageApi(workspaceId, {
          content: html,
          channelId: channelId ?? undefined,
          conversationId: conversationId ?? undefined,
          parentId: parentId ?? undefined,
          alsoSendToChannel: opts.alsoSendToChannel ?? false,
          scheduledAt: opts.scheduledAtIso,
        })
        await clearCurrentDraft()
        applyHtmlToComposer('', false)
        void queryClient.invalidateQueries({
          queryKey: scheduledMessageKeys.all(workspaceId),
        })
        toast.success(t('messageScheduled'))
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: unknown } }; message?: string }
        const raw = err?.response?.data?.message ?? err?.message ?? t('scheduleFailed')
        const msg = Array.isArray(raw) ? raw.join(', ') : String(raw)
        toast.error(msg)
        throw e
      } finally {
        setIsScheduling(false)
      }
    },
    [
      channelId,
      conversationId,
      parentId,
      pendingFiles.length,
      workspaceId,
      queryClient,
      clearCurrentDraft,
      applyHtmlToComposer,
      t,
    ],
  )

  const onSubmit = useCallback(
    async (htmlContent: string, options?: { alsoSendToChannel?: boolean }) => {
      const textContent = previewPlainFromDraftHtml(htmlContent, 50_000).trim()
      const hasContent = textContent !== ""
      const hasFiles = pendingFiles.length > 0

      if (!hasContent && !hasFiles) return

      const contentToSend = hasContent ? htmlContent : ""
      const filesToUpload = [...pendingFiles]

      clearPendingFiles()

      const payload: any = {
        content: contentToSend,
        parentId: parentId || undefined,
        alsoSendToChannel: options?.alsoSendToChannel ?? false,
        workspaceId,
      }

      if (!targetId && !channelId) {
        payload.userIds = currentConversationData?.members
          ?.filter((m) => m.id !== currentUser?.id)
          .map((m) => m.id)
      }

      // Tạo placeholder attachments NGAY để optimistic message có bubble hiển thị spinner.
      // useSendMessage.onMutate chạy SYNCHRONOUSLY (trước khi API call),
      // nên message sẽ hiện trong message list ngay lập tức khi gọi sendMessage().
      //
      // Optimistic upload pattern:
      // - payload chỉ gửi field backend chấp nhận (CreateMessageSchema):
      //   url, type, name, size, mimeType, pendingUpload=true, pendingUploadId.
      // - Không gửi `id`, `uploadStatus` (server không biết → sẽ fail Zod validation).
      // - Sau khi upload file thật xong → gọi endpoint finalize để PATCH URL.
      if (hasFiles) {
        // Lưu files để retry có thể đọc lại (vì pendingFiles đã bị clearPendingFiles xoá)
        const filesSnapshot = filesToUpload
        // Gắn files snapshot vào scope để upload per-file dùng
        ;(payload as any).__filesSnapshot = filesSnapshot

        payload.attachments = filesToUpload.map(({ id: uploadId, file }) => ({
          // Field backend chấp nhận (CreateMessageSchema):
          // - url: optional khi pendingUpload=true
          // - type, name, size: bắt buộc
          // - pendingUpload=true: server lưu row với url rỗng, client sẽ finalize sau
          // - pendingUploadId: client-generated uploadId (Math.random)
          url: undefined,
          type: inferAttachmentTypeFromMime(file.type),
          name: file.name,
          size: file.size,
          mimeType: file.type,
          pendingUpload: true,
          pendingUploadId: uploadId,
        }))
      }

      // Bước 1: Gọi sendMessage NGAY — không await upload.
      // useSendMessage.onMutate chạy sync → optimistic message xuất hiện ngay.
      // Attachments trong optimistic message là placeholders với uploadStatus='uploading'.
      sendMessage(payload, {
        onSuccess: async (newMessage, _payload, _ctx) => {
          await clearCurrentDraft()

          if (isNewMessageMode) {
            if (newMessage.channelId) {
              router.push(
                `/workspace/${workspaceId}/channel/${newMessage.channelId}`,
              )
            } else if (newMessage.conversationId) {
              if (pathname.includes("/dms")) {
                openDmInWorkspace(
                  router,
                  pathname,
                  workspaceId,
                  newMessage.conversationId,
                )
              } else {
                router.push(
                  `/workspace/${workspaceId}/dm/${newMessage.conversationId}`,
                )
              }
            }
          }

          if (hasFiles) {
            // Sau khi server trả về message thật (kèm attachment rows đã lưu với pendingUploadId),
            // bắt đầu upload từng file SONG SONG rồi gọi API finalize.
            // PHẢI await Promise.allSettled để toast chỉ hiển thị SAU khi mọi file settle
            // (success hoặc fail). Nếu fire-and-forget, toast xuất hiện ngay khi server
            // tạo message xong, trước cả khi file upload lên Cloudinary/S3.
            const filesSnapshot: PendingFile[] = (payload as any).__filesSnapshot
            const results = await Promise.allSettled(
              filesSnapshot.map(async ({ id: uploadId, file }) => {
                try {
                  const uploaded = await uploadFileBinary(file, uploadId)
                  // Upload thành công → gọi API finalize để PATCH URL thật lên server.
                  // Backend trả về presigned URL (nếu là S3) hoặc URL gốc (nếu là Cloudinary).
                  // Dùng URL từ response thay vì uploaded.url gốc để đảm bảo URL đầy đủ.
                  const finalizeResult = await finalizeAttachment({
                    messageId: newMessage.id,
                    pendingUploadId: uploadId,
                    url: uploaded.url,
                    mimeType: uploaded.mimeType ?? file.type,
                    width: uploaded.width,
                    height: uploaded.height,
                    duration: uploaded.duration,
                    fileCategory: uploaded.fileCategory,
                  })
                  // Patch cache: gắn URL từ backend response + clear uploadStatus.
                  // Match theo pendingUploadId (client-generated uploadId) thay vì uploadId
                  // vì attachment trong optimistic chỉ có pendingUploadId, không có uploadId.
                  updateAttachmentInMessageCache(
                    queryClient,
                    { pendingUploadId: uploadId },
                    (a) => {
                      if (a.pendingUploadId !== uploadId) return a
                      const next: MessageAttachment = {
                        ...a,
                        url: finalizeResult.url,
                        uploadStatus: null,
                        uploadId: undefined,
                        pendingUploadId: null,
                        // Thêm preview fields để Office thumbnail hiển thị ngay
                        previewImageUrl: finalizeResult.previewImageUrl ?? null,
                      }
                      return next
                    },
                    workspaceId,
                  )
                  return { uploadId, ok: true as const }
                } catch {
                  // Upload fail hoặc finalize fail → hiện Retry trên bubble.
                  // Persist vào localStorage để retry được khi refresh/mở lại tab.
                  addPendingUploadEntry({
                    messageId: newMessage.id,
                    pendingUploadId: uploadId,
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    savedAt: new Date().toISOString(),
                  })
                  // Match cũng phải theo pendingUploadId vì attachment trong optimistic
                  // không có field uploadId (cùng bug đã fix ở nhánh success).
                  updateAttachmentInMessageCache(
                    queryClient,
                    { pendingUploadId: uploadId },
                    { uploadStatus: "failed" },
                    workspaceId,
                  )
                  return { uploadId, ok: false as const }
                }
              }),
            )

            // Đếm số file upload thành công/thất bại → toast phù hợp.
            const total = filesSnapshot.length
            const successCount = results.filter(
              (r) => r.status === "fulfilled" && r.value.ok,
            ).length
            const failedCount = total - successCount

            if (failedCount === 0) {
              // Tất cả file upload thành công → toast như cũ.
              toast.success(
                t("messageSentWithFiles", { count: total }),
              )
            } else if (successCount === 0) {
              // Toàn bộ file fail → ẨN optimistic message + xóa trên backend + toast lỗi.
              // User không muốn thấy message "nửa mùa" khi tất cả file fail.
              const messageIdToRemove = newMessage.id
              const parentIdForDelete = newMessage.parentId ?? undefined

              // 1. Xóa optimistic message khỏi React Query cache
              const removeFromCache = (old: any) => {
                if (!old?.pages) return old
                return {
                  ...old,
                  pages: old.pages.map((page: any) => ({
                    ...page,
                    messages: (page.messages ?? []).filter(
                      (m: any) => m.id !== messageIdToRemove,
                    ),
                    threads: (page.threads ?? []).map((t: any) =>
                      t.id === messageIdToRemove
                        ? t
                        : {
                            ...t,
                            replies: (t.replies ?? []).filter(
                              (r: any) => r.id !== messageIdToRemove,
                            ),
                          },
                    ),
                  })),
                }
              }

              const listKey =
                messageKeys.list(targetId) ||
                (channelId
                  ? messageKeys.list(channelId)
                  : conversationId
                    ? messageKeys.list(conversationId)
                    : null)

              if (listKey) {
                queryClient.setQueryData(listKey, removeFromCache)
              }
              if (parentId) {
                queryClient.setQueryData(
                  messageKeys.thread(parentId),
                  removeFromCache,
                )
              }
              if (workspaceId) {
                queryClient.setQueryData(
                  messageKeys.threads(workspaceId),
                  removeFromCache,
                )
              }

              // 2. Xóa message trên backend (message đã được tạo với pendingUpload=true)
              //    → gọi DELETE /messages/:id để dọn rác
              try {
                await fetch(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/messages/${messageIdToRemove}`,
                  {
                    method: "DELETE",
                    credentials: "include",
                  },
                )
              } catch (err) {
                // best-effort: nếu backend fail vẫn rollback local
                console.warn("[useMessageComposer] delete failed message:", err)
              }

              // 3. Restore pendingFiles để user có thể retry (đã bị clearPendingFiles trước đó)
              setPendingFiles(filesSnapshot)

              // 4. Toast lỗi
              toast.error(
                t("messageSentFilesAllFailed", { count: total }),
              )
            } else {
              // Partial → toast success nhưng kèm số lượng fail (user biết cần retry).
              toast.success(
                t("messageSentWithFilesPartial", {
                  success: successCount,
                  total,
                  failed: failedCount,
                }),
              )
            }
          }
        },
      })
    },
    [
      sendMessage,
      pendingFiles,
      clearPendingFiles,
      uploadFileBinary,
      finalizeAttachment,
      queryClient,
      targetId,
      channelId,
      currentConversationData?.members,
      currentUser?.id,
      workspaceId,
      parentId,
      isNewMessageMode,
      router,
      pathname,
      clearCurrentDraft,
      t,
    ],
  )

  const workspaceTimeZone = currentUser?.timeZone ?? null

  return {
    onSubmit,
    scheduleMessage,
    isScheduling,
    isSending: isSending || isUploading,
    pendingFiles,
    uploadingFiles,
    addPendingFiles,
    removePendingFile,
    clearPendingFiles,
    updateMessageContent,
    onComposerHtmlChange,
    composerInitialHtml,
    composerEditorKey: `${draftContextKey}:${composerRemountNonce}`,
    scheduledSendAck,
    workspaceTimeZone,
  }
}
