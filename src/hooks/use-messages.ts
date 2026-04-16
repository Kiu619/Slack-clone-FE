'use client'

import { useChannelChatSocket, useThreadSocket } from '@/hooks/use-socket'
import { apiClient } from '@/lib/axios'
import { messageKeys } from '@/lib/query-keys'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import type { Message, MessagesPage, SendMessagePayload, Reaction } from '@/lib/types'
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

// ─── Mutation Helpers ──────────────────────────────────────────────────────────

/** Cập nhật reaction list cho 1 message object */
function updateMessageReactions(msg: Message, emoji: string, userId: string): Reaction[] {
  const existing = msg.reactions.find((r) => r.emoji === emoji)
  const alreadyReacted = existing?.userIds.includes(userId)
  
  if (alreadyReacted) {
    return msg.reactions
      .map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== userId) }
          : r,
      )
      .filter((r) => r.count > 0)
  } 
  
  if (existing) {
    return msg.reactions.map((r) =>
      r.emoji === emoji
        ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
        : r,
    )
  }
  
  return [...msg.reactions, { emoji, count: 1, userIds: [userId] }]
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
      if (msg.type === 'system') return

      // Nếu là reply và không có cờ "alsoSendToChannel" -> KHÔNG hiển thị ở Channel list
      if (msg.parentId && !msg.alsoSendToChannel) return

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
              messages: page.messages.map((m) => {
                if (m.id === updated.id) return { ...m, ...updated }
                // Nếu tin này là reply và có parent là tin vừa update -> sync snippet
                if (m.parentId === updated.id) {
                  return { ...m, parent: m.parent ? { ...m.parent, ...updated } : undefined }
                }
                return m
              }),
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                  ? {
                      ...m,
                      attachments: m.attachments.filter(
                        (a) => a.id !== payload.attachmentId,
                      ),
                    }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  const handleMessageMetadataUpdated = useCallback(
    (data: { 
      messageId: string; 
      replyCount: number; 
      replyParticipantIds: string[]; 
      lastReplyAt: string 
    }) => {
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
                  ? {
                      ...m,
                      replyCount: data.replyCount,
                      replyParticipantIds: data.replyParticipantIds,
                      lastReplyAt: data.lastReplyAt,
                    }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [channelId, queryClient],
  )

  useChannelChatSocket(channelId, isConnected, {
    onMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onReactionUpdate: handleReactionUpdate,
    onAttachmentAdded: handleAttachmentAdded,
    onAttachmentDeleted: handleAttachmentDeleted,
    onMessageMetadataUpdated: handleMessageMetadataUpdated,
  })

  return query
}

/**
 * useThreadMessages — load lịch sử reply + nhận realtime qua WebSocket
 */
export function useThreadMessages(parentId: string, isConnected: boolean) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<MessagesPage>({
    queryKey: ['thread-messages', parentId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = {}
      if (pageParam) params.cursor = pageParam as string
      const res = await apiClient.get<MessagesPage>(
        `/messages/${parentId}/replies`,
        { params },
      )
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
  })

  const handleNewReply = useCallback(
    (newMessage: unknown) => {
      const msg = newMessage as Message
      if (msg.parentId !== parentId) return

      queryClient.setQueryData(
        ['thread-messages', parentId],
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old?.pages.length) return old
          const alreadyExists = old.pages.some((page) =>
            page.messages.some((m) => m.id === msg.id),
          )
          if (alreadyExists) return old

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
    [parentId, queryClient],
  )

  const handleReplyUpdated = useCallback(
    (data: unknown) => {
      const updated = data as Partial<Message> & { id: string }
      queryClient.setQueryData(
        ['thread-messages', parentId],
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
    [parentId, queryClient],
  )

  const handleReplyDeleted = useCallback(
    (data: { messageId: string }) => {
      queryClient.setQueryData(
        ['thread-messages', parentId],
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
    [parentId, queryClient],
  )

  const handleReactionUpdate = useCallback(
    (data: unknown) => {
      const payload = data as { messageId: string; action: string; emoji: string; userId: string }
      queryClient.setQueryData(
        ['thread-messages', parentId],
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
    [parentId, queryClient],
  )

  useThreadSocket(parentId, isConnected, {
    onMessage: handleNewReply,
    onMessageUpdated: handleReplyUpdated,
    onMessageDeleted: handleReplyDeleted,
    onReactionUpdate: handleReactionUpdate,
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
        alsoSendToChannel: payload.alsoSendToChannel ?? false,
        editedAt: null,
        deletedAt: null,
        replyCount: 0,
        replyParticipantIds: [],
        lastReplyAt: null,
        reactions: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const previousChannelData = queryClient.getQueryData(messageKeys.list(channelId))
      const previousThreadData = payload.parentId 
        ? queryClient.getQueryData(['thread-messages', payload.parentId])
        : null

      // 1. Nếu là tin nhắn gốc HOẶC reply có "alsoSendToChannel" -> Prepend vào Channel
      if (!payload.parentId || payload.alsoSendToChannel) {
        queryClient.setQueryData(
          messageKeys.list(channelId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old?.pages.length) return old
            const firstPage = old.pages[0]
            // Tránh duplicate nếu message đã tồn tại (do broadcast nhanh hơn REST response)
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

      // 2. Nếu là reply -> Prepend vào Thread cache
      if (payload.parentId) {
        queryClient.setQueryData(
          ['thread-messages', payload.parentId],
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            // Nếu chưa có cache cho thread này, ta khởi tạo nó
            const current = old || { pages: [], pageParams: [] }
            const pages = current.pages.length > 0 
              ? current.pages 
              : [{ messages: [], nextCursor: null, hasMore: false }]
            const firstPage = pages[0]
            
            // Tránh duplicate
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

        // 3. Cập nhật replyCount cho tin nhắn cha trong Channel list (UI sync)
        queryClient.setQueryData(
          messageKeys.list(channelId),
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                messages: page.messages.map(m => {
                  if (m.id !== payload.parentId) return m;
                  
                  // Cập nhật participantIds (thêm userId hiện tại nếu chưa có)
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

        // 4. Sync with ThreadPanel Store if it's the parent message
        const { updateMessage, message: openParent } = useThreadPanelStore.getState()
        if (openParent?.id === payload.parentId) {
          updateMessage({
            id: payload.parentId,
            replyCount: (openParent.replyCount || 0) + 1,
            lastReplyAt: tempMessage.createdAt,
            // Logic participant IDs cập nhật tương tự như trên
            replyParticipantIds: openParent.replyParticipantIds?.includes(currentUser?.id || '')
              ? openParent.replyParticipantIds
              : [...(openParent.replyParticipantIds || []), currentUser?.id || ''].slice(0, 5)
          })
        }
      }

      return { previousChannelData, previousThreadData, tempId: tempMessage.id }
    },

    onSuccess: (newMessage, payload, context) => {
      // Replace temp message trong Channel cache
      if (!payload.parentId || payload.alsoSendToChannel) {
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
      }

      // Replace temp message trong Thread cache
      if (payload.parentId) {
        queryClient.setQueryData(
          ['thread-messages', payload.parentId],
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
      }
    },

    onError: (_err, payload, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousChannelData)
      }
      if (payload.parentId && context?.previousThreadData) {
        queryClient.setQueryData(['thread-messages', payload.parentId], context.previousThreadData)
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
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string; userId: string; parentId?: string }) => {
      const res = await apiClient.post(`/messages/${messageId}/reactions`, { emoji })
      return res.data
    },

    onMutate: async ({ messageId, emoji, userId, parentId }) => {
      const previousChannelData = queryClient.getQueryData(messageKeys.list(channelId))
      const previousThreadData = parentId ? queryClient.getQueryData(['thread-messages', parentId]) : null

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
                return { ...msg, reactions: updateMessageReactions(msg, emoji, userId) }
              }),
            })),
          }
        },
      )

      // 2. Sync with Thread Messages cache
      if (parentId) {
        queryClient.setQueryData(
          ['thread-messages', parentId],
          (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((msg) => {
                  if (msg.id !== messageId) return msg
                  return { ...msg, reactions: updateMessageReactions(msg, emoji, userId) }
                }),
              })),
            }
          },
        )
      }

      // Sync with ThreadPanel Store if this message is open
      const { updateMessage, message: openParent } = useThreadPanelStore.getState()
      if (openParent?.id === messageId) {
        updateMessage({ id: messageId, reactions: updateMessageReactions(openParent, emoji, userId) })
      }

      return { previousChannelData, previousThreadData }
    },

    onError: (_err, { parentId }, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousChannelData)
      }
      if (parentId && context?.previousThreadData) {
        queryClient.setQueryData(['thread-messages', parentId], context.previousThreadData)
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
    mutationFn: ({ messageId, content }: { messageId: string; content: string; parentId?: string }) => {
      return apiClient.patch(`/messages/${messageId}`, { content })
    },

    onMutate: async ({ messageId, content, parentId }) => {
      const previousChannelData = queryClient.getQueryData(messageKeys.list(channelId))
      const previousThreadData = parentId ? queryClient.getQueryData(['thread-messages', parentId]) : null

      queryClient.setQueryData(
        messageKeys.list(channelId),
        (old: { pages: MessagesPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => {
                if (m.id === messageId) {
                  return { ...m, content, editedAt: new Date().toISOString() }
                }
                // Sync snippet tin nhắn cha cho các reply
                if (m.parentId === messageId) {
                  return { ...m, parent: m.parent ? { ...m.parent, content } : undefined }
                }
                return m
              }),
            })),
          }
        },
      )

      // 2. Sync with Thread Messages cache
      if (parentId) {
        queryClient.setQueryData(
          ['thread-messages', parentId],
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
      }

      // 3. Sync with ThreadPanel Store if this message is open
      const { updateMessage, message: openParent } = useThreadPanelStore.getState()
      if (openParent?.id === messageId) {
        updateMessage({ id: messageId, content, editedAt: new Date().toISOString() })
      }

      return { previousChannelData, previousThreadData }
    },

    onError: (_err, { parentId }, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousChannelData)
      }
      if (parentId && context?.previousThreadData) {
        queryClient.setQueryData(['thread-messages', parentId], context.previousThreadData)
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
    mutationFn: ({ messageId, parentId }: { messageId: string; parentId?: string }) => {
      return apiClient.delete(`/messages/${messageId}`)
    },

    onMutate: async ({ messageId, parentId }) => {
      const previousChannelData = queryClient.getQueryData(messageKeys.list(channelId))
      const previousThreadData = parentId ? queryClient.getQueryData(['thread-messages', parentId]) : null

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

      // 2. Sync with Thread Messages cache
      if (parentId) {
        queryClient.setQueryData(
          ['thread-messages', parentId],
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
      }

      // 3. Sync with ThreadPanel Store if this message is open
      const { updateMessage, message: openParent } = useThreadPanelStore.getState()
      if (openParent?.id === messageId) {
        updateMessage({ id: messageId, deletedAt: new Date().toISOString(), content: '' })
      }

      return { previousChannelData, previousThreadData }
    },

    onError: (_err, { parentId }, context) => {
      if (context?.previousChannelData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousChannelData)
      }
      if (parentId && context?.previousThreadData) {
        queryClient.setQueryData(['thread-messages', parentId], context.previousThreadData)
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

      void queryClient.invalidateQueries({
        queryKey: messageKeys.channelAttachments(channelId),
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(messageKeys.list(channelId), context.previousData)
      }
    },
  })
}