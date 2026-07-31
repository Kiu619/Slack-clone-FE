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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getWorkspaceProfileApi } from '@/apis'
import { useSendMessage } from '@/hooks/use-messages'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useNewMessageStore } from '@/stores/useNewMessageStore'
import { usePendingDraftNavigationStore } from '@/stores/usePendingDraftNavigationStore'
import { authKeys, draftKeys, messageKeys, scheduledMessageKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/axios'
import { usePathname, useRouter } from 'next/navigation'
import type { Message, DirectMessageConversation, User } from '@/lib/types'
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
  const closeNewMessage = useNewMessageStore((s) => s.closeNewMessage)
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
            toast.info(
              'File đính kèm chưa gửi không được lưu vào draft — chỉ nội dung soạn thảo được lưu.',
            )
          }
        } catch {
          /* offline / 403 */
        }
      })()
    }
  }, [draftContextKey, workspaceId, draftUserId, queryClient])

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const pendingFilesRef = useRef<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])

  const addPendingFiles = useCallback((files: File[]) => {
    const newItems: PendingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
    }))
    setPendingFiles((prev) => [...prev, ...newItems])
  }, [])

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
        toast.error('Chọn kênh hoặc cuộc trò chuyện trước khi lên lịch.')
        return
      }
      if (pendingFiles.length > 0) {
        toast.error(`Application haven't supported schedule message with file attachments yet.`)
        return
      }
      const html = htmlBufferRef.current
      const plain = previewPlainFromDraftHtml(html, 50_000).trim()
      if (!plain) {
        toast.error('Nội dung tin nhắn không được để trống.')
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
        toast.success('Đã lên lịch gửi tin nhắn.')
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: unknown } }; message?: string }
        const raw = err?.response?.data?.message ?? err?.message ?? 'Lên lịch thất bại.'
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
    ],
  )

  const onSubmit = useCallback(
    async (htmlContent: string, options?: { alsoSendToChannel?: boolean }) => {
      const textContent = previewPlainFromDraftHtml(htmlContent, 50_000).trim()
      const hasContent = textContent !== ''
      const hasFiles = pendingFiles.length > 0

      if (!hasContent && !hasFiles) return

      const contentToSend = hasContent ? htmlContent : ''
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

      if (hasFiles) {
        setIsUploading(true)
        try {
          const attachments = await Promise.all(
            filesToUpload.map(({ file }) => uploadFileBinary(file)),
          )
          payload.attachments = attachments
        } catch {
          toast.error('Có lỗi xảy ra khi tải file. Vui lòng thử lại.')
          return
        } finally {
          setIsUploading(false)
        }
      }

      sendMessage(payload, {
        onSuccess: async (newMessage) => {
          await clearCurrentDraft()

          if (isNewMessageMode) {
            closeNewMessage()
            if (newMessage.channelId) {
              router.push(
                `/workspace/${workspaceId}/channel/${newMessage.channelId}`,
              )
            } else if (newMessage.conversationId) {
              if (pathname.includes('/dms')) {
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
            toast.success(`Đã gửi tin nhắn kèm ${filesToUpload.length} file`)
            clearUploadingFiles()
          }
        },
      })
    },
    [
      sendMessage,
      pendingFiles,
      clearPendingFiles,
      clearUploadingFiles,
      uploadFileBinary,
      targetId,
      channelId,
      currentConversationData?.members,
      currentUser?.id,
      workspaceId,
      parentId,
      isNewMessageMode,
      router,
      pathname,
      closeNewMessage,
      clearCurrentDraft,
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
