import type { QueryClient } from '@tanstack/react-query'

import { messageKeys } from '@/lib/query-keys'
import type { DirectMessageConversation, Message } from '@/lib/types'

/**
 * Cập nhật mọi query danh sách DM của workspace (kể cả bản có `q` search)
 * khi có tin nhắn mới trong một conversation.
 */
export function applyIncomingDmMessageToConversationsCaches(
  queryClient: QueryClient,
  workspaceId: string,
  message: Message,
  options?: {
    currentUserId?: string
    activeConversationId?: string | null
  },
): void {
  if (!message.conversationId || !message.user?.id) return

  const msgWs = (message as { workspaceId?: string }).workspaceId
  if (msgWs && msgWs !== workspaceId) return

  const predicate = (query: { queryKey: readonly unknown[] }) => {
    const k = query.queryKey
    return (
      Array.isArray(k) &&
      k[0] === 'dm-conversations' &&
      k[1] === workspaceId
    )
  }

  let didInvalidate = false
  let shouldIncrementSummary = false

  queryClient.setQueriesData<DirectMessageConversation[] | undefined>(
    { predicate },
    (old) => {
      if (!old?.length) return old

      const index = old.findIndex((c) => c.id === message.conversationId)
      const next = [...old]

      if (index !== -1) {
        if (old[index].lastMessageId === message.id) {
          return old
        }
        const hasReliableViewerId = Boolean(options?.currentUserId)
        const shouldIncreaseUnread =
          hasReliableViewerId &&
          message.user.id !== options?.currentUserId &&
          message.conversationId !== (options?.activeConversationId ?? null)
        const prevUnreadCount = old[index].unreadCount ?? 0
        if (shouldIncreaseUnread && prevUnreadCount === 0) {
          shouldIncrementSummary = true
        }
        const updated: DirectMessageConversation = {
          ...old[index],
          lastMessageAt: message.createdAt,
          lastMessageContent: message.content,
          lastMessageUserId: message.user.id,
          lastMessageId: message.id,
          updatedAt: message.createdAt,
          lastMessageUser: {
            id: message.user.id,
            name: message.user.name ?? null,
            displayName: message.user.displayName ?? null,
          },
          unreadCount: Math.max(
            0,
            (old[index].unreadCount ?? 0) + (shouldIncreaseUnread ? 1 : 0),
          ),
        }
        next.splice(index, 1)
        return [updated, ...next]
      }

      if (!didInvalidate) {
        didInvalidate = true
        void queryClient.invalidateQueries({
          queryKey: messageKeys.conversations(workspaceId),
        })
      }
      return old
    },
  )

  if (shouldIncrementSummary) {
    queryClient.setQueryData<{ count: number } | undefined>(
      messageKeys.conversationsUnreadSummary(workspaceId),
      (old) => ({ count: Math.max(0, (old?.count ?? 0) + 1) }),
    )
  }
}

/**
 * Khi sửa tin: nếu tin đó là `lastMessageId` của DM trong cache thì cập nhật preview sidebar (`lastMessageContent`).
 * Giữ `lastMessageAt` (thời điểm gửi gốc) để sort danh sách không đổi khi chỉ edit.
 */
export function patchDmSidebarIfLastMessageEdited(
  queryClient: QueryClient,
  workspaceId: string,
  message: Message,
): void {
  if (!message.conversationId || message.channelId) return

  const msgWs = message.workspaceId
  if (msgWs && msgWs !== workspaceId) return

  const predicate = (query: { queryKey: readonly unknown[] }) => {
    const k = query.queryKey
    return (
      Array.isArray(k) &&
      k[0] === 'dm-conversations' &&
      k[1] === workspaceId
    )
  }

  queryClient.setQueriesData<DirectMessageConversation[] | undefined>(
    { predicate },
    (old) => {
      if (!old?.length) return old
      const idx = old.findIndex((c) => c.id === message.conversationId)
      if (idx === -1) return old
      const conv = old[idx]
      if (conv.lastMessageId !== message.id) return old

      const next = [...old]
      next[idx] = {
        ...conv,
        lastMessageContent: message.content,
        updatedAt: message.updatedAt ?? message.editedAt ?? conv.updatedAt,
      }
      return next
    },
  )
}
