'use client'

import { fetchDirectMessagesApi, getDmUnreadSummaryApi } from '@/apis'
import { useSocket, useUserSocket } from '@/hooks/use-socket'
import { applyIncomingDmMessageToConversationsCaches } from '@/lib/conversations-cache'
import { messageKeys } from '@/lib/query-keys'
import type { Message } from '@/lib/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuth } from './use-auth'

export function useConversations(workspaceId: string, q?: string) {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { isConnected } = useSocket()

  const query = useQuery({
    queryKey: [...messageKeys.conversations(workspaceId), q],
    queryFn: () => fetchDirectMessagesApi(workspaceId, q),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })

  // Lắng nghe tin nhắn mới để cập nhật lastMessageAt và đưa conversation lên đầu
  const onMessage = useCallback(
    (msg: unknown) => {
      const message = msg as Message
      if (!message.conversationId) return

      console.log('[useConversations] Received real-time message:', message.id, 'for conversation:', message.conversationId)

      applyIncomingDmMessageToConversationsCaches(
        queryClient,
        workspaceId,
        message,
      )
    },
    [workspaceId, queryClient],
  )

  // Lắng nghe trên room cá nhân của user để nhận tin nhắn từ bất kỳ cuộc hội thoại nào
  // Dùng event message:sidebar để tránh duplicate với timeline chat
  useUserSocket(currentUser?.id ?? null, isConnected, { onNewSidebarMessage: onMessage })

  return query
}

export function useDmUnreadSummary(workspaceId: string) {
  const query = useQuery({
    queryKey: messageKeys.conversationsUnreadSummary(workspaceId),
    queryFn: () => getDmUnreadSummaryApi(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  })

  return {
    ...query,
    count: query.data?.count ?? 0,
  }
}
