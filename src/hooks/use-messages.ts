'use client'

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/axios'
import { messageKeys } from '@/lib/query-keys'
import { useChannelSocket } from '@/hooks/use-socket'
import type { Message, MessagesPage, SendMessagePayload, TypingUser } from '@/lib/types'

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchMessages(channelId: string, cursor?: string): Promise<MessagesPage> {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<MessagesPage>(`/channels/${channelId}/messages`, { params })
  return res.data
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useMessages — load lịch sử + nhận realtime qua WebSocket
 *
 * Deduplication strategy (tránh duplicate message):
 *   - Backend exclude sender's socket khỏi broadcast (dùng X-Socket-Id header)
 *   - Sender dùng optimistic update, không nhận WS event cho message của mình
 *   - handleNewMessage chỉ xử lý message từ người khác, kiểm tra exists toàn bộ cache
 */
export function useMessages(channelId: string, isConnected: boolean) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<MessagesPage>({
    queryKey: messageKeys.list(channelId),
    queryFn: ({ pageParam }) =>
      fetchMessages(channelId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
  })

  const handleNewMessage = useCallback(
    (newMessage: unknown) => {
      const msg = newMessage as Message
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old?.pages.length) return old

          // Kiểm tra exists trên TẤT CẢ pages (không chỉ page đầu)
          const alreadyExists = old.pages.some((page) =>
            page.messages.some((m) => m.id === msg.id),
          )
          if (alreadyExists) return old

          // Prepend vào page đầu (mới nhất)
          const firstPage = old.pages[0]
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
    [channelId, queryClient],
  )

  const handleMessageUpdated = useCallback(
    (data: unknown) => {
      const updated = data as Partial<Message> & { id: string }
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === updated.id ? { ...m, ...updated } : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  const handleMessageDeleted = useCallback(
    (data: { messageId: string }) => {
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === data.messageId
                  ? { ...m, deletedAt: new Date().toISOString(), content: '' }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  const handleReactionUpdate = useCallback(
    (data: unknown) => {
      const payload = data as { messageId: string; action: string; emoji: string; userId: string }
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => {
                if (m.id !== payload.messageId) return m
                const existing = m.reactions.find((r) => r.emoji === payload.emoji)
                let newReactions = m.reactions
                if (payload.action === 'added') {
                  if (existing) {
                    newReactions = m.reactions.map((r) =>
                      r.emoji === payload.emoji
                        ? { ...r, count: r.count + 1, userIds: [...r.userIds, payload.userId] }
                        : r,
                    )
                  } else {
                    newReactions = [...m.reactions, { emoji: payload.emoji, count: 1, userIds: [payload.userId] }]
                  }
                } else {
                  newReactions = m.reactions
                    .map((r) =>
                      r.emoji === payload.emoji
                        ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== payload.userId) }
                        : r,
                    )
                    .filter((r) => r.count > 0)
                }
                return { ...m, reactions: newReactions }
              }),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  /**
   * handleAttachmentAdded — khi có attachment mới được thêm vào message
   * Refetch message đó để cập nhật attachments
   */
  const handleAttachmentAdded = useCallback(
    (data: unknown) => {
      const payload = data as { messageId: string; attachment: unknown }
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === payload.messageId
                  ? { ...m, attachments: [...m.attachments, payload.attachment] }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  useChannelSocket(channelId, isConnected, {
    onMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onReactionUpdate: handleReactionUpdate,
    onAttachmentAdded: handleAttachmentAdded,
  })

  return query
}

/**
 * useSendMessage — gửi message qua REST API với optimistic update
 *
 * Sender KHÔNG nhận lại WS broadcast vì backend dùng X-Socket-Id header
 * để exclude sender's socket khỏi broadcast.
 * → Không cần bất kỳ deduplication logic nào ở frontend.
 */
export function useSendMessage(
  channelId: string,
  currentUser: { id: string; name: string | null; email: string; avatar: string | null } | null,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<Message> => {
      const res = await apiClient.post<Message>(`/channels/${channelId}/messages`, payload)
      return res.data
    },

    onMutate: async (payload) => {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        channelId,
        user: {
          id: currentUser?.id ?? 'me',
          name: currentUser?.name ?? null,
          avatar: currentUser?.avatar ?? null,
          email: currentUser?.email ?? '',
        },
        content: payload.content,
        type: 'text',
        parentId: payload.parentId ?? null,
        editedAt: null,
        deletedAt: null,
        reactions: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const previousData = queryClient.getQueryData(messageKeys.list(channelId))

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old?.pages.length) return old
          const firstPage = old.pages[0]
          return {
            ...old,
            pages: [
              { ...firstPage, messages: [tempMessage, ...firstPage.messages] },
              ...old.pages.slice(1),
            ],
          }
        },
      )

      return { previousData, tempId: tempMessage.id }
    },

    onSuccess: (newMessage, _payload, context) => {
      // Replace temp message bằng real message từ server
      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === context?.tempId ? newMessage : m,
              ),
            })),
          }
        },
      )
    },

    onError: (_err, _payload, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousData)
      }
    },
  })
}

/**
 * useAddReaction — toggle reaction với optimistic update
 */
export function useAddReaction(channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string; userId: string }) => {
      const res = await apiClient.post(`/messages/${messageId}/reactions`, { emoji })
      return res.data
    },

    onMutate: async ({ messageId, emoji, userId }) => {
      const previousData = queryClient.getQueryData(messageKeys.list(channelId))

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) => {
                if (msg.id !== messageId) return msg
                const existing = msg.reactions.find((r) => r.emoji === emoji)
                const alreadyReacted = existing?.userIds.includes(userId)
                let newReactions = msg.reactions
                if (alreadyReacted) {
                  newReactions = msg.reactions
                    .map((r) =>
                      r.emoji === emoji
                        ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== userId) }
                        : r,
                    )
                    .filter((r) => r.count > 0)
                } else if (existing) {
                  newReactions = msg.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
                      : r,
                  )
                } else {
                  newReactions = [...msg.reactions, { emoji, count: 1, userIds: [userId] }]
                }
                return { ...msg, reactions: newReactions }
              }),
            })),
          }
        },
      )

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousData)
      }
    },
  })
}

/**
 * useTypingIndicator — quản lý typing state từ WebSocket
 */
export function useTypingIndicator(
  channelId: string,
  currentUserId: string,
  isConnected: boolean,
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    if (typingUsers.length === 0) return
    const timer = setTimeout(() => setTypingUsers([]), 4000)
    return () => clearTimeout(timer)
  }, [typingUsers])

  const handleTyping = useCallback(
    (data: {
      channelId: string
      user: { userId: string; name: string | null }
      isTyping: boolean
    }) => {
      if (data.channelId !== channelId) return
      if (data.user.userId === currentUserId) return

      setTypingUsers((prev) => {
        if (data.isTyping) {
          const exists = prev.some((u) => u.userId === data.user.userId)
          if (exists) return prev
          return [...prev, { userId: data.user.userId, name: data.user.name, avatar: null }]
        } else {
          return prev.filter((u) => u.userId !== data.user.userId)
        }
      })
    },
    [channelId, currentUserId],
  )

  useChannelSocket(channelId, isConnected, { onTyping: handleTyping })

  return typingUsers
}
