/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
  checkLaterMessagesApi,
  fetchPinnedChannelMessagesApi,
  fetchPinnedConversationMessagesApi,
  fetchThreadsApi,
  markThreadAsReadApi,
  removeLaterByMessageIdApi,
  saveItemApi,
  togglePinMessageApi,
} from '@/apis'
import { toast } from 'sonner'
import {
  getChannelChatSocket,
  useChannelChatSocket,
  useConversationChatSocket,
  useThreadSocket,
  useUserSocket,
} from '@/hooks/use-socket'
import { useMessageSync } from '@/hooks/use-message-sync'
import { apiClient } from '@/lib/axios'
import { applyIncomingDmMessageToConversationsCaches, patchDmSidebarIfLastMessageEdited } from '@/lib/conversations-cache'
import { messageKeys } from '@/lib/query-keys'
import type { Message, MessagesPage, Reaction, SaveItemPayload, ThreadsPage } from '@/lib/types'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useMessageStore } from '@/stores/useMessageStore'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

export interface SendMessagePayload {
  content: string
  parentId?: string
  alsoSendToChannel?: boolean
  /** userIds: dÃ¹ng cho trÆ°á»ng há»£p gá»­i tin nháº¯n Ä‘áº§u tiÃªn Ä‘á»ƒ táº¡o DM conversation */
  userIds?: string[]
  /** workspaceId: dÃ¹ng kÃ¨m vá»›i userIds */
  workspaceId?: string
  attachments?: {
    url: string
    type: 'image' | 'video' | 'audio' | 'file'
    name: string
    size: number
    mimeType?: string
    width?: number
    height?: number
    duration?: number
    fileCategory?: string
  }[]
}

// â”€â”€â”€ Fetcher (Migrated to use-channel-messages.ts) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Pinned Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function usePinnedMessages(target: {
  channelId?: string
  conversationId?: string
}) {
  const { channelId, conversationId } = target
  const targetId = (channelId || conversationId) as string

  return useQuery<Message[]>({
    queryKey: ['pinned-messages', targetId],
    queryFn: () =>
      channelId
        ? fetchPinnedChannelMessagesApi(channelId)
        : fetchPinnedConversationMessagesApi(conversationId!),
    staleTime: 30 * 1000,
    enabled: !!targetId,
  })
}

export function useTogglePin(targetId: string, workspaceId?: string) {
  const queryClient = useQueryClient()
  const store = useMessageStore()

  return useMutation({
    mutationFn: (messageId: string) => togglePinMessageApi(messageId),
    onMutate: async (messageId) => {
      const previousMessages = queryClient.getQueryData(messageKeys.list(targetId))
      const previousThreads = workspaceId ? queryClient.getQueryData(messageKeys.threads(workspaceId)) : null

      const entity = useMessageStore.getState().entities[messageId]
      let currentPinned: boolean
      if (entity && typeof entity.isPinned === 'boolean') {
        currentPinned = entity.isPinned
      } else {
        let fromList: boolean | undefined
        if (previousMessages && typeof previousMessages === 'object' && 'pages' in previousMessages) {
          const old = previousMessages as { pages: { messages: { id: string; isPinned?: boolean }[] }[] }
          for (const page of old.pages) {
            const m = page.messages.find((x) => x.id === messageId)
            if (m) {
              fromList = !!m.isPinned
              break
            }
          }
        }
        currentPinned = fromList ?? false
      }
      const nextPinned = !currentPinned

      // 1. Update Zustand Store (Slack-style)
      store.updateMessage(targetId, messageId, { isPinned: nextPinned })

      // 2. Update Main Messages cache (Legacy - for compatibility)
      if (targetId) {
        queryClient.setQueryData(
          messageKeys.list(targetId),
          (old: any) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((m: any) =>
                  m.id === messageId ? { ...m, isPinned: nextPinned } : m,
                ),
              })),
            }
          },
        )
      }
      // ... giá»¯ nguyÃªn pháº§n threads cache update

      // 2. Update Threads Page cache
      if (workspaceId) {
        queryClient.setQueryData(
          messageKeys.threads(workspaceId),
          (old: { pages: ThreadsPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                threads: page.threads.map((t) => {
                  if (t.id === messageId) return { ...t, isPinned: nextPinned }
                  return {
                    ...t,
                    replies: t.replies.map((r) =>
                      r.id === messageId ? { ...r, isPinned: nextPinned } : r,
                    ),
                  }
                }),
              })),
            }
          },
        )
      }

      return { previousMessages, previousThreads }
    },
    onSuccess: (data, messageId) => {
      store.updateMessage(targetId, messageId, { isPinned: data.isPinned })
      void queryClient.invalidateQueries({ queryKey: ['pinned-messages', targetId] })
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(messageKeys.list(targetId), context.previousMessages)
      }
      if (workspaceId && context?.previousThreads) {
        queryClient.setQueryData(messageKeys.threads(workspaceId), context.previousThreads)
      }
    },
  })
}

// â”€â”€â”€ Mutation Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Cáº­p nháº­t reaction list cho 1 message object */
export function updateMessageReactions(msg: Message, emoji: string, userId: string, action?: 'added' | 'removed'): Reaction[] {
  const reactionsList = msg.reactions ?? []
  const existing = reactionsList.find((r) => r.emoji === emoji)

  // XÃ¡c Ä‘á»‹nh xem nÃªn add hay remove dá»±a trÃªn action hoáº·c toggle náº¿u khÃ´ng cÃ³ action
  let shouldAdd: boolean
  if (action) {
    shouldAdd = action === 'added'
  } else {
    const alreadyReacted = existing?.userIds.includes(userId)
    shouldAdd = !alreadyReacted
  }

  if (shouldAdd) {
    if (existing) {
      return reactionsList.map((r) =>
        r.emoji === emoji
          ? {
              ...r,
              userIds: [...new Set([...r.userIds, userId])],
              users: [
                ...(r.users ?? []),
                { id: userId, name: null, displayName: null, avatar: null },
              ].filter(
                (u, index, arr) => arr.findIndex((x) => x.id === u.id) === index,
              ),
              count: [...new Set([...r.userIds, userId])].length,
            }
          : r,
      )
    }
    return [
      ...reactionsList,
      {
        emoji,
        count: 1,
        userIds: [userId],
        users: [{ id: userId, name: null, displayName: null, avatar: null }],
      },
    ]
  } else {
    if (!existing) return reactionsList
    return reactionsList
      .map((r) =>
        r.emoji === emoji
          ? {
              ...r,
              userIds: r.userIds.filter((id) => id !== userId),
              users: (r.users ?? []).filter((u) => u.id !== userId),
              count: r.userIds.filter((id) => id !== userId).length,
            }
          : r,
      )
      .filter((r) => r.count > 0)
  }
}

// â”€â”€â”€ Hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// useMessages has been migrated to use-channel-messages.ts

/**
 * useThreads â€” Láº¥y danh sÃ¡ch threads trong workspace + nháº­n realtime
 */
export function useThreads(workspaceId: string, userId: string, isConnected: boolean) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<ThreadsPage>({
    queryKey: messageKeys.threads(workspaceId),
    queryFn: async ({ pageParam }) => {
      const data = await fetchThreadsApi(workspaceId, pageParam as string | undefined)
      // LÆ°u trá»¯ thá»±c thá»ƒ vÃ o Zustand Ä‘á»ƒ Ä‘á»“ng bá»™ toÃ n cá»¥c
      const allMessages: Message[] = []
      data.threads.forEach(t => {
        allMessages.push(t)
        if (t.replies) allMessages.push(...t.replies)
      })
      useMessageStore.getState().upsertEntities(allMessages)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
  })

  const { syncMessageUpdate, syncMessageDeletion } = useMessageSync()


  // Khi cÃ³ tin nháº¯n má»›i tá»« báº¥t ká»³ Ä‘Ã¢u, náº¿u lÃ  reply -> invalidate threads list
  const handleNewMessage = useCallback(
    (newMessage: any) => {
      const msg = newMessage as Message
      if (msg.parentId) {
        // 1. Invalidate Ä‘á»ƒ server sáº¯p xáº¿p láº¡i thá»© tá»± threads (unread/lastActivity)
        void queryClient.invalidateQueries({ queryKey: messageKeys.threads(workspaceId) })

        // 2. Cáº­p nháº­t Entity Store - mark parent as unread if reply is from another user
        const parentEntity = useMessageStore.getState().entities[msg.parentId]
        if (parentEntity) {
          useMessageStore.getState().updateEntity(msg.parentId, {
            isUnread: msg.user.id !== userId,
          } as Partial<Message>)
        }

        // 3. Thêm reply vào store
        useMessageStore.getState().upsertEntities([msg])

        // 4. Cáº­p nháº­t snippet (váº«n cáº§n manual vÃ¬ liÃªn quan Ä‘áº¿n cáº¥u trÃºc array snippet)
        queryClient.setQueryData(
          messageKeys.threads(workspaceId),
          (old: { pages: ThreadsPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                threads: page.threads.map((t) => {
                  if (t.id !== msg.parentId) return t
                  const alreadyExists = t.replies.some(r => r.id === msg.id)
                  if (alreadyExists) return t
                  return {
                    ...t,
                    replies: [...t.replies, msg].slice(-4),
                    isUnread: msg.user.id !== userId,
                    lastReplyAt: msg.createdAt
                  }
                }),
              })),
            }
          },
        )
      }
    },
    [workspaceId, queryClient, userId],
  )

  const handleAttachmentAdded = useCallback(
    (data: any) => {
      const { messageId, attachment } = data
      const msg = useMessageStore.getState().entities[messageId]
      if (msg) {
        const exists = msg.attachments?.some((a: any) => a.id === attachment.id)
        if (!exists) {
          syncMessageUpdate({
            id: messageId,
            attachments: [...(msg.attachments || []), attachment]
          })
        }
      }
    },
    [syncMessageUpdate],
  )

  const handleMessageUpdated = useCallback(
    (data: any) => {
      // Sá»­ dá»¥ng Sync Engine táº­p trung - nÃ³ sáº½ lo viá»‡c cáº­p nháº­t Entities + RQ Threads Page
      syncMessageUpdate(data)
    },
    [syncMessageUpdate],
  )

  const handleThreadPanelMessage = useCallback(
    (newMessage: any) => {
      const msg = newMessage as Message
      if (!msg.parentId) return

      // Cáº­p nháº­t snippet cho thread card tÆ°Æ¡ng á»©ng
      queryClient.setQueryData(
        messageKeys.threads(workspaceId),
        (old: { pages: ThreadsPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              threads: page.threads.map((t) => {
                if (t.id !== msg.parentId) return t

                const alreadyExists = t.replies.some(r => r.id === msg.id)
                if (alreadyExists) return t

                const newReplies = [...t.replies, msg].slice(-4)
                return {
                  ...t,
                  replies: newReplies,
                  isUnread: msg.user.id !== userId,
                  lastReplyAt: msg.createdAt
                }
              }),
            })),
          }
        },
      )
    },
    [workspaceId, queryClient, userId]
  )

  const handleMessageDeleted = useCallback(
    (data: { messageId: string }) => {
      syncMessageDeletion(data.messageId)
    },
    [syncMessageDeletion],
  )

  const handleAttachmentDeleted = useCallback(
    (data: any) => {
      const { messageId, attachmentId } = data
      const msg = useMessageStore.getState().entities[messageId]
      if (msg) {
        syncMessageUpdate({
          id: messageId,
          attachments: msg.attachments?.filter((a: any) => a.id !== attachmentId)
        })
      }
    },
    [syncMessageUpdate],
  )

  const handleMessagePinned = useCallback(
    (data: { messageId: string; isPinned: boolean; userId?: string }) => {
      syncMessageUpdate({ id: data.messageId, isPinned: data.isPinned })
    },
    [syncMessageUpdate],
  )

  useUserSocket(userId, isConnected, {
    onNewSidebarMessage: handleNewMessage,
    onAttachmentAdded: handleAttachmentAdded,
    onMessageUpdated: handleMessageUpdated, // Láº¯ng nghe thÃªm event update (Ä‘á»ƒ xÃ³a placeholder)
  })

  // Láº¯ng nghe thÃªm cÃ¡c sá»± kiá»‡n tá»« Thread Panel Ä‘á»ƒ cáº­p nháº­t Snippet á»Ÿ Threads Page
  // ChÃºng ta dÃ¹ng getChannelChatSocket trá»±c tiáº¿p vÃ¬ useUserSocket khÃ´ng há»— trá»£ thread-panel:*
  const socket = getChannelChatSocket()
  useEffect(() => {
    if (!isConnected || !userId) return

    socket.on('thread-panel:message', handleThreadPanelMessage)
    socket.on('thread-panel:message_updated', handleMessageUpdated)
    socket.on('thread-panel:message_deleted', handleMessageDeleted)
    socket.on('thread-panel:attachment_added', handleAttachmentAdded)
    socket.on('thread-panel:attachment_deleted', handleAttachmentDeleted)
    socket.on('thread-panel:message_pinned', handleMessagePinned)

    // Reconnect logic: Khi socket reconnect, invalidate threads list Ä‘á»ƒ láº¥y data má»›i nháº¥t
    const handleReconnect = () => {
      void queryClient.invalidateQueries({
        queryKey: messageKeys.threads(workspaceId),
      })
    }
    socket.on('connect', handleReconnect)

    return () => {
      socket.off('thread-panel:message', handleThreadPanelMessage)
      socket.off('thread-panel:message_updated', handleMessageUpdated)
      socket.off('thread-panel:message_deleted', handleMessageDeleted)
      socket.off('thread-panel:attachment_added', handleAttachmentAdded)
      socket.off('thread-panel:attachment_deleted', handleAttachmentDeleted)
      socket.off('thread-panel:message_pinned', handleMessagePinned)
      socket.off('connect', handleReconnect)
    }
  }, [isConnected, userId, socket, handleThreadPanelMessage, handleMessageUpdated, handleMessageDeleted, handleAttachmentAdded, handleAttachmentDeleted, handleMessagePinned, workspaceId, queryClient])

  return query
}

/**
 * useMarkThreadAsRead â€” ÄÃ¡nh dáº¥u thread Ä‘Ã£ Ä‘á»c
 */
export function useMarkThreadAsRead(workspaceId: string) {
  const queryClient = useQueryClient()

  const { syncMessageUpdate } = useMessageSync()

  return useMutation({
    mutationFn: (parentId: string) => markThreadAsReadApi(parentId),
    onSuccess: (_, parentId) => {
      // Cáº­p nháº­t Entity Store vÃ  List Cache (isUnread thuá»™c ThreadMessage/snippet, khÃ´ng cÃ³ trÃªn Message)
      syncMessageUpdate({ id: parentId, isUnread: false } as Partial<Message> & { id: string })
    },
  })
}

/**
 * useThreadMessages â€” load lá»‹ch sá»­ reply + nháº­n realtime qua WebSocket
 */
export function useThreadMessages(parentId: string, userId: string, isConnected: boolean) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<MessagesPage>({
    queryKey: messageKeys.thread(parentId),
    queryFn: async ({ pageParam, direction }) => {
      const params: Record<string, string> = { direction: direction === 'backward' ? 'forward' : 'backward' }
      if (pageParam) params.cursor = pageParam as string
      const res = await apiClient.get<MessagesPage>(
        `/messages/${parentId}/replies`,
        { params },
      )
      // Push entities to store
      useMessageStore.getState().upsertEntities(res.data.messages)
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
  })

  const { syncMessageUpdate, syncMessageDeletion } = useMessageSync()


  const handleNewReply = useCallback(
    (newMessage: unknown) => {
      const msg = newMessage as Message
      if (msg.parentId !== parentId || msg.type === 'system') return

      // LÆ°u Ã½: Viá»‡c Ä‘Æ°a vÃ o Entity Store Ä‘Ã£ Ä‘Æ°á»£c useGlobalSync lo liá»‡u
      // á»ž Ä‘Ã¢y chÃºng ta chá»‰ cáº§n cáº­p nháº­t danh sÃ¡ch hiá»ƒn thá»‹ cá»§a React Query

      queryClient.setQueryData(
        messageKeys.thread(parentId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          const alreadyExists = old.pages.some((page) =>
            page.messages.some((m) => m.id === msg.id),
          )
          if (alreadyExists) return old

          const firstPage = old.pages[0] || { messages: [] }
          return {
            ...old,
            pages: [
              { ...firstPage, messages: [msg, ...firstPage.messages] },
              ...old.pages.slice(1),
            ],
          }
        },
      )
    },
    [parentId, queryClient],
  )

  useThreadSocket(parentId, isConnected, {
    onMessage: handleNewReply,
  })

  return query
}

/**
 * useSendMessage â€” gá»­i message qua REST API vá»›i optimistic update
 *
 * Sender KHÃ”NG nháº­n láº¡i WS broadcast vÃ¬ backend dÃ¹ng X-Socket-Id header
 * Ä‘á»ƒ exclude sender's socket khá»i broadcast.
 * â†’ Cáº­p nháº­t cache danh sÃ¡ch DM (sidebar) trong onMutate/onSuccess, khÃ´ng chá» entity:sync.
 */
export function useSendMessage(
  target: { channelId?: string; conversationId?: string },
  currentUser: { id: string; name: string | null; displayName: string | null; email: string; avatar: string | null } | null,
  workspaceId?: string,
) {
  const { channelId, conversationId } = target
  const targetId = (channelId || conversationId) as string
  const queryClient = useQueryClient()
  const store = useMessageStore()

  return useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<Message> => {
      let url: string
      if (channelId) {
        url = `/channels/${channelId}/messages`
      } else if (conversationId) {
        url = `/direct-messages/${conversationId}/messages`
      } else {
        // TrÆ°á»ng há»£p gá»­i tin nháº¯n Ä‘áº§u tiÃªn Ä‘á»ƒ táº¡o DM
        url = `/direct-messages/messages`
      }

      const res = await apiClient.post<Message>(url, payload)
      return res.data
    },

    onMutate: async (payload) => {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        channelId: channelId ?? null,
        conversationId: conversationId ?? null,
        workspaceId: workspaceId ?? undefined,
        user: {
          id: currentUser?.id ?? 'me',
          name: currentUser?.name ?? null,
          displayName: currentUser?.displayName ?? null,
          avatar: currentUser?.avatar ?? null,
          email: currentUser?.email ?? '',
        },
        content: payload.content,
        type: 'text',
        parentId: payload.parentId ?? null,
        alsoSendToChannel: payload.alsoSendToChannel ?? false,
        editedAt: null,
        deletedAt: null,
        replyCount: 0,
        replyParticipantIds: [],
        lastReplyAt: null,
        isPinned: false,
        reactions: [],
        attachments: (payload.attachments ?? []).map((a: any, i: number) => ({
          ...a,
          id: `temp-att-${Date.now()}-${i}`,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (workspaceId && conversationId && !channelId) {
        applyIncomingDmMessageToConversationsCaches(
          queryClient,
          workspaceId,
          tempMessage,
        )
      }

      const previousChannelData = targetId ? queryClient.getQueryData(messageKeys.list(targetId)) : null
      const previousThreadData = payload.parentId
        ? queryClient.getQueryData(messageKeys.thread(payload.parentId))
        : null

      // 1. Zustand Store (Optimistic)
      if (targetId && (!payload.parentId || payload.alsoSendToChannel)) {
        store.addMessage(targetId, tempMessage)
      }
      if (payload.parentId && !payload.alsoSendToChannel) {
        store.upsertEntities([tempMessage])
      }

      // 2. React Query (Legacy)
      if (targetId && (!payload.parentId || payload.alsoSendToChannel)) {
        queryClient.setQueryData(
          messageKeys.list(targetId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old?.pages.length) return old
            const firstPage = old.pages[0]
            // TrÃ¡nh duplicate náº¿u message Ä‘Ã£ tá»“n táº¡i (do broadcast nhanh hÆ¡n REST response)
            const alreadyExists = firstPage.messages.some(m => m.id === tempMessage.id)
            if (alreadyExists) return old

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

      // 2. Náº¿u lÃ  reply -> Prepend vÃ o Thread cache
      if (payload.parentId) {
        queryClient.setQueryData(
          messageKeys.thread(payload.parentId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            // Náº¿u chÆ°a cÃ³ cache cho thread nÃ y, ta khá»Ÿi táº¡o nÃ³
            const current = old || { pages: [], pageParams: [] }
            const pages = current.pages.length > 0
              ? current.pages
              : [{ messages: [], nextCursor: null, hasMore: false }]
            const firstPage = pages[0]

            // TrÃ¡nh duplicate
            const alreadyExists = firstPage.messages.some(m => m.id === tempMessage.id)
            if (alreadyExists) return old

            return {
              ...current,
              pages: [
                { ...firstPage, messages: [tempMessage, ...firstPage.messages] },
                ...pages.slice(1),
              ],
            }
          },
        )

        // 3. Cáº­p nháº­t replyCount cho tin nháº¯n cha trong Channel list (UI sync)
        if (targetId) {
          queryClient.setQueryData(
            messageKeys.list(targetId),
            (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map(page => ({
                  ...page,
                  messages: page.messages.map(m => {
                    if (m.id !== payload.parentId) return m;

                    // Cáº­p nháº­t participantIds (thÃªm userId hiá»‡n táº¡i náº¿u chÆ°a cÃ³)
                    const newParticipantIds = [...(m.replyParticipantIds || [])];
                    if (currentUser?.id && !newParticipantIds.includes(currentUser.id)) {
                      if (newParticipantIds.length < 5) {
                        newParticipantIds.push(currentUser.id);
                      }
                    }

                    return {
                      ...m,
                      replyCount: (m.replyCount || 0) + 1,
                      replyParticipantIds: newParticipantIds,
                      lastReplyAt: tempMessage.createdAt
                    };
                  })
                }))
              }
            }
          )
        }

        // 4. Sync with ThreadPanel Store if it's the parent message
        const { updateMessage, messageId: openParentId } = useThreadPanelStore.getState()
        if (openParentId === payload.parentId) {
          const openParent = store.entities[openParentId!]
          if (openParent) {
            updateMessage({
              id: payload.parentId!,
              replyCount: (openParent.replyCount || 0) + 1,
              lastReplyAt: tempMessage.createdAt,
              replyParticipantIds: openParent.replyParticipantIds?.includes(currentUser?.id || '')
                ? openParent.replyParticipantIds
                : [...(openParent.replyParticipantIds || []), currentUser?.id || ''].slice(0, 5)
            })
          }
        }

        // 5. Optimistic update cho Threads Page cache
        // ChÃ¨n tempMessage vÃ o máº£ng replies cá»§a thread cha tÆ°Æ¡ng á»©ng
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey[0] === 'workspaces' && query.queryKey[2] === 'threads' },
          (old: any) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map((page: any) => {
                if (!page.threads) return page
                return {
                  ...page,
                  threads: page.threads.map((t: any) => {
                    if (t.id === payload.parentId) {
                      if (t.replies.some((r: any) => r.id === tempMessage.id)) return t
                      return { ...t, replies: [...t.replies, tempMessage] }
                    }
                    return t
                  }),
                }
              }),
            }
          }
        )
      }

      return { previousChannelData, previousThreadData, tempId: tempMessage.id }
    },

    onSuccess: (newMessage, payload, context) => {
      // Náº¿u lÃ  tin nháº¯n táº¡o conversation má»›i, ta cáº§n cáº­p nháº­t láº¡i targetId
      const actualTargetId = newMessage.channelId || newMessage.conversationId;

      // Replace temp message trong Zustand Store (chuyá»ƒn key temp â†’ id tháº­t Ä‘á»ƒ edit/reaction hoáº¡t Ä‘á»™ng)
      if (actualTargetId && (!payload.parentId || payload.alsoSendToChannel)) {
        const tempId = context?.tempId
        if (tempId && tempId !== newMessage.id) {
          store.finalizePendingMessage(actualTargetId, tempId, newMessage)
        } else {
          store.updateMessage(actualTargetId, tempId || newMessage.id, newMessage)
        }
      }
      if (payload.parentId && actualTargetId && !payload.alsoSendToChannel) {
        const tempId = context?.tempId
        if (tempId && tempId !== newMessage.id) {
          store.finalizePendingMessage(actualTargetId, tempId, newMessage)
        } else {
          store.upsertEntities([newMessage])
        }
      }

      // Replace temp message trong Channel cache (Legacy)
      if (actualTargetId && (!payload.parentId || payload.alsoSendToChannel)) {
        queryClient.setQueryData(
          messageKeys.list(actualTargetId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  (m.id === context?.tempId || (m.id === newMessage.id && m !== newMessage)) ? newMessage : m,
                ),
              })),
            }
          },
        )
      }

      // Replace temp message trong Thread cache
      if (payload.parentId) {
        queryClient.setQueryData(
          messageKeys.thread(payload.parentId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  (m.id === context?.tempId || (m.id === newMessage.id && m !== newMessage)) ? newMessage : m,
                ),
              })),
            }
          },
        )

        // Replace temp message trong Threads Page cache
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey[0] === 'workspaces' && query.queryKey[2] === 'threads' },
          (old: any) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map((page: any) => {
                if (!page.threads) return page
                return {
                  ...page,
                  threads: page.threads.map((t: any) => {
                    if (t.id === payload.parentId) {
                      return {
                        ...t,
                        replies: t.replies.map((r: any) =>
                          r.id === context?.tempId ? newMessage : r
                        ),
                      }
                    }
                    return t
                  }),
                }
              }),
            }
          }
        )
      }

      const wsId =
        workspaceId ??
        (typeof newMessage.workspaceId === 'string'
          ? newMessage.workspaceId
          : undefined)
      if (wsId && newMessage.conversationId) {
        applyIncomingDmMessageToConversationsCaches(
          queryClient,
          wsId,
          newMessage,
        )
      }
    },

    onError: (_err, payload, context) => {
      if (targetId && context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(targetId), context.previousChannelData)
      }
      if (payload.parentId && context?.previousThreadData) {
        queryClient.setQueryData(messageKeys.thread(payload.parentId), context.previousThreadData)
      }
      if (workspaceId && conversationId && !channelId) {
        void queryClient.invalidateQueries({
          queryKey: messageKeys.conversations(workspaceId),
        })
      }
    },
  })
}

/**
 * useAddReaction â€” toggle reaction vá»›i optimistic update
 */
export function useAddReaction(targetId: string, workspaceId?: string) {
  const queryClient = useQueryClient()
  const store = useMessageStore()

  const applyReactionSnapshot = useCallback(
    (messageId: string, reactions: Reaction[]) => {
      store.updateEntity(messageId, { reactions })

      const updateTransform = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === messageId ? { ...msg, reactions } : msg,
            ),
          })),
        }
      }

      queryClient.setQueriesData({ queryKey: messageKeys.all }, updateTransform)
      queryClient.setQueriesData({ queryKey: messageKeys.threadsAll }, updateTransform)
      if (workspaceId) {
        queryClient.setQueriesData({ queryKey: messageKeys.threads(workspaceId) }, (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads.map((t: any) => {
                if (t.id === messageId) return { ...t, reactions }
                return {
                  ...t,
                  replies: t.replies.map((r: any) =>
                    r.id === messageId ? { ...r, reactions } : r,
                  ),
                }
              }),
            })),
          }
        })
      }
    },
    [queryClient, store, workspaceId],
  )

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string; userId: string; parentId?: string }) => {
      const res = await apiClient.post(`/messages/${messageId}/reactions`, { emoji })
      return res.data
    },

    onMutate: async ({ messageId, emoji, userId, parentId: _parentId }) => {
      // 1. Zustand Store (Optimistic) â€” chá»‰ khi Ä‘Ã£ cÃ³ entity (reply thread-only giá» Ä‘Ã£ Ä‘Æ°á»£c upsert)
      const entity = store.entities[messageId]
      if (entity) {
        store.updateEntity(messageId, {
          reactions: updateMessageReactions(entity, emoji, userId),
        })
      }

      // 2. React Query cache (Optimistic) - Cáº­p nháº­t táº¥t cáº£ cÃ¡c loáº¡i list tin nháº¯n
      const previousData = new Map()

      const updateTransform = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) => {
              if (msg.id !== messageId) return msg
              return { ...msg, reactions: updateMessageReactions(msg, emoji, userId) }
            }),
          })),
        }
      }

      // Channel lists + thread reply lists (cÃ¹ng shape pages[].messages)
      queryClient.setQueriesData({ queryKey: messageKeys.all }, updateTransform)
      queryClient.setQueriesData({ queryKey: messageKeys.threadsAll }, updateTransform)
      // Threads Page (Snippet)
      if (workspaceId) {
        queryClient.setQueriesData({ queryKey: messageKeys.threads(workspaceId) }, (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads.map((t: any) => {
                if (t.id === messageId) return { ...t, reactions: updateMessageReactions(t as any, emoji, userId) }
                return {
                  ...t,
                  replies: t.replies.map((r: any) =>
                    r.id === messageId ? { ...r, reactions: updateMessageReactions(r as any, emoji, userId) } : r
                  )
                }
              })
            }))
          }
        })
      }

      return { previousData }
    },

    onSuccess: (data, vars) => {
      if (Array.isArray((data as { reactions?: Reaction[] }).reactions)) {
        applyReactionSnapshot(
          vars.messageId,
          (data as { reactions: Reaction[] }).reactions,
        )
      }
    },

    onError: (_err, _vars, _context) => {
      // Invalidate Ä‘á»ƒ Ä‘áº£m báº£o data chuáº©n tá»« server khi cÃ³ lá»—i
      void queryClient.invalidateQueries({ queryKey: messageKeys.all })
      void queryClient.invalidateQueries({ queryKey: messageKeys.threadsAll })
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: messageKeys.threads(workspaceId) })
    },
  })
}

/**
 * useUpdateMessage â€” chá»‰nh sá»­a message vá»›i optimistic update
 */
export function useUpdateMessage(targetId: string, workspaceId?: string) {
  const queryClient = useQueryClient()
  const store = useMessageStore()

  return useMutation({
    mutationFn: ({
      messageId,
      content,
      attachments,
      deletedAttachmentIds,
    }: {
      messageId: string
      content: string
      attachments?: any[]
      deletedAttachmentIds?: string[]
      parentId?: string
    }) => {
      return apiClient.patch(`/messages/${messageId}`, {
        content,
        attachments,
        deletedAttachmentIds,
      })
    },

    onMutate: async ({
      messageId,
      content,
      parentId,
      attachments,
      deletedAttachmentIds,
    }) => {
      const editedAt = new Date().toISOString()

      // 1. Zustand Store (Optimistic)
      const msg = store.entities[messageId]
      if (msg) {
        const remainingAttachments = msg.attachments?.filter((a: any) => !deletedAttachmentIds?.includes(a.id)) || []
        store.updateEntity(messageId, { content, editedAt, attachments: remainingAttachments })
        const merged = useMessageStore.getState().entities[messageId]
        const ws = workspaceId ?? merged?.workspaceId
        if (ws && merged?.conversationId && !merged.channelId) {
          patchDmSidebarIfLastMessageEdited(queryClient, ws, merged)
        }
      }

      // 2. React Query
      await queryClient.cancelQueries({ queryKey: messageKeys.list(targetId) })
      if (parentId) await queryClient.cancelQueries({ queryKey: messageKeys.thread(parentId) })

      const previousChannelData = queryClient.getQueryData(messageKeys.list(targetId))
      const previousThreadData = parentId ? queryClient.getQueryData(messageKeys.thread(parentId)) : null
      const previousThreadsData = workspaceId ? queryClient.getQueryData(messageKeys.threads(workspaceId)) : null

      const updateTransform = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) => {
              if (m.id !== messageId) return m
              const remainingAttachments = m.attachments?.filter((a: any) => !deletedAttachmentIds?.includes(a.id)) || []
              return { ...m, content, editedAt, attachments: remainingAttachments }
            }),
          })),
        }
      }

      if (targetId) queryClient.setQueryData(messageKeys.list(targetId), updateTransform)
      if (parentId) queryClient.setQueryData(messageKeys.thread(parentId), updateTransform)

      if (workspaceId) {
        queryClient.setQueryData(messageKeys.threads(workspaceId), (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads.map((t: any) => {
                if (t.id === messageId) return { ...t, content, editedAt }
                return {
                  ...t,
                  replies: t.replies.map((r: any) =>
                    r.id === messageId ? { ...r, content, editedAt } : r
                  )
                }
              })
            }))
          }
        })
      }

      // 3. Sync with Thread Panel
      const { updateMessage: syncThreadPanel, messageId: openParentId } = useThreadPanelStore.getState()
      if (openParentId === messageId) {
        const openParent = store.entities[openParentId]
        if (openParent) {
          const remainingAttachments = openParent.attachments?.filter((a: any) => !deletedAttachmentIds?.includes(a.id)) || []
          syncThreadPanel({ id: messageId, content, editedAt, attachments: remainingAttachments })
        }
      }

      return { previousChannelData, previousThreadData, previousThreadsData }
    },

    onSuccess: (res) => {
      // Cáº­p nháº­t dá»¯ liá»‡u chuáº©n tá»« server
      const updatedMessage = res.data as Message
      const ws = workspaceId ?? updatedMessage.workspaceId
      if (ws && updatedMessage.conversationId && !updatedMessage.channelId) {
        patchDmSidebarIfLastMessageEdited(queryClient, ws, updatedMessage)
      }
      const updateTransform = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) => m.id === updatedMessage.id ? updatedMessage : m),
          })),
        }
      }
      if (targetId) queryClient.setQueryData(messageKeys.list(targetId), updateTransform)
      const parentId = updatedMessage.parentId
      if (parentId) queryClient.setQueryData(messageKeys.thread(parentId), updateTransform)

      // Sync with ThreadPanel Store
      const { updateMessage: syncThreadPanel, messageId: openParentId } = useThreadPanelStore.getState()
      if (openParentId === updatedMessage.id) {
        syncThreadPanel(updatedMessage)
      }
    },

    onError: (_err, { parentId }, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(targetId), context.previousChannelData)
      }
      if (parentId && context?.previousThreadData) {
        queryClient.setQueryData(messageKeys.thread(parentId), context.previousThreadData)
      }
      if (workspaceId && context?.previousThreadsData) {
        queryClient.setQueryData(messageKeys.threads(workspaceId), context.previousThreadsData)
      }
    },
  })
}

/**
 * useDeleteMessage - xÃ³a message (soft delete)
 */
export function useDeleteMessage(targetId: string, workspaceId?: string) {
  const queryClient = useQueryClient()
  const store = useMessageStore()

  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; parentId?: string }) => {
      return apiClient.delete(`/messages/${messageId}`)
    },

    onMutate: async ({ messageId, parentId }) => {
      const deletedAt = new Date().toISOString()

      // 1. Zustand Store (Optimistic)
      store.updateEntity(messageId, { deletedAt, content: '' })

      // 2. React Query
      await queryClient.cancelQueries({ queryKey: messageKeys.list(targetId) })
      if (parentId) await queryClient.cancelQueries({ queryKey: messageKeys.thread(parentId) })

      const previousChannelData = queryClient.getQueryData(messageKeys.list(targetId))
      const previousThreadData = parentId ? queryClient.getQueryData(messageKeys.thread(parentId)) : null
      const previousThreadsData = workspaceId ? queryClient.getQueryData(messageKeys.threads(workspaceId)) : null

      const deleteTransform = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === messageId ? { ...m, deletedAt, content: '' } : m
            ),
          })),
        }
      }

      if (targetId) queryClient.setQueryData(messageKeys.list(targetId), deleteTransform)
      if (parentId) queryClient.setQueryData(messageKeys.thread(parentId), deleteTransform)

      if (workspaceId) {
        queryClient.setQueryData(messageKeys.threads(workspaceId), (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads.map((t: any) => {
                if (t.id === messageId) return { ...t, deletedAt, content: '' }
                return {
                  ...t,
                  replies: t.replies.map((r: any) =>
                    r.id === messageId ? { ...r, deletedAt, content: '' } : r
                  )
                }
              })
            }))
          }
        })
      }

      // 3. Sync vá»›i Thread Panel
      const { updateMessage: syncThreadPanel, messageId: openParentId } = useThreadPanelStore.getState()
      if (openParentId === messageId) {
        syncThreadPanel({ id: messageId, deletedAt, content: '' })
      }

      return { previousChannelData, previousThreadData, previousThreadsData }
    },

    onError: (_err, { parentId }, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(targetId), context.previousChannelData)
      }
      if (parentId && context?.previousThreadData) {
        queryClient.setQueryData(['thread-messages', parentId], context.previousThreadData)
      }
      if (workspaceId && context?.previousThreadsData) {
        queryClient.setQueryData(messageKeys.threads(workspaceId), context.previousThreadsData)
      }
    },
  })
}

/**
 * useDeleteAttachment - xÃ³a attachment vÄ©nh viá»…n
 */
export function useDeleteAttachment(targetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => {
      return apiClient.delete(`/attachments/${attachmentId}`)
    },

    onMutate: async (attachmentId) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.all })
      const previousData = queryClient.getQueryData(messageKeys.list(targetId))

      // Cáº­p nháº­t optimistic: XÃ³a attachment khá»i táº¥t cáº£ tin nháº¯n trong cache nÃ y
      queryClient.setQueriesData(
        { queryKey: messageKeys.all },
        (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((m: any) => ({
                ...m,
                attachments: m.attachments?.filter((a: any) => a.id !== attachmentId),
              })),
            })),
          }
        },
      )

      return { previousData }
    },

    onSuccess: () => {
      // Invalidate Ä‘á»ƒ Ä‘áº£m báº£o data chuáº©n tá»« server
      void queryClient.invalidateQueries({ queryKey: messageKeys.all })
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(messageKeys.list(targetId), context.previousData)
      }
    },
  })
}

/**
 * useSaveForLater - lÆ°u tin nháº¯n hoáº·c file vÃ o danh sÃ¡ch Later
 */
export function useSaveForLater(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveItemPayload) => saveItemApi(workspaceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-items', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['saved-items-summary', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['later-saved-messages'] })
      toast.success('Saved for later')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to save'
      toast.error(message)
    },
  })
}

/**
 * Toggle message in Later: save if not saved, remove all matching Later rows if saved.
 */
export function useToggleLaterMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { savedMessageIds } = await checkLaterMessagesApi(workspaceId, [
        messageId,
      ])
      const isSaved = savedMessageIds.includes(messageId)
      if (isSaved) {
        await removeLaterByMessageIdApi(workspaceId, messageId)
        return 'removed' as const
      }
      await saveItemApi(workspaceId, { type: 'message', messageId })
      return 'saved' as const
    },
    onSuccess: (action) => {
      void queryClient.invalidateQueries({ queryKey: ['saved-items', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['saved-items-summary', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['later-saved-messages'] })
      toast.success(
        action === 'removed' ? 'Removed from Later' : 'Saved for later',
      )
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Something went wrong'
      toast.error(message)
    },
  })
}
