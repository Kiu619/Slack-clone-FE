'use client'

import { useChannelSocket } from '@/hooks/use-socket'
import { apiClient } from '@/lib/axios'
import { messageKeys } from '@/lib/query-keys'
import type { Message, MessagesPage, SendMessagePayload } from '@/lib/types'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback } from 'react'

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
                  ? { ...m, attachments: [...m.attachments, payload.attachment as any] }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  const handleAttachmentDeleted = useCallback(
    (data: unknown) => {
      const payload = data as { messageId: string; attachmentId: string }
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
                  ? { ...m, attachments: m.attachments.filter((a) => a.id !== payload.attachmentId) }
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
    // @ts-ignore
    onAttachmentDeleted: handleAttachmentDeleted,
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
 * useUpdateMessage — chỉnh sửa message với optimistic update
 */
export function useUpdateMessage(channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) => {
      return apiClient.patch(`/messages/${messageId}`, { content })
    },

    onMutate: async ({ messageId, content }) => {
      const previousData = queryClient.getQueryData(messageKeys.list(channelId))

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId ? { ...m, content, editedAt: new Date().toISOString() } : m,
              ),
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
 * useDeleteMessage - xóa message (soft delete)
 */
export function useDeleteMessage(channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => {
      return apiClient.delete(`/messages/${messageId}`)
    },

    onMutate: async (messageId) => {
      const previousData = queryClient.getQueryData(messageKeys.list(channelId))

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? { ...m, deletedAt: new Date().toISOString(), content: '' }
                  : m,
              ),
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
 * useDeleteAttachment - xóa attachment vĩnh viễn
 */
export function useDeleteAttachment(channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => {
      return apiClient.delete(`/attachments/${attachmentId}`)
    },

    onMutate: async (attachmentId) => {
      const previousData = queryClient.getQueryData(messageKeys.list(channelId))

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => ({
                ...m,
                attachments: m.attachments.filter((a) => a.id !== attachmentId),
              })),
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
