'use client'

import { listChannelAttachmentsApi, listConversationAttachmentsApi } from '@/apis'
import { messageKeys } from '@/lib/query-keys'
import type { ChannelAttachmentsPage } from '@/lib/types'
import { useInfiniteQuery } from '@tanstack/react-query'

/**
 * useChannelAttachments — danh sách file trong channel (REST + phân trang).
 * Real-time invalidate qua `entity:sync` trong useGlobalSync.
 */
export function useChannelAttachments(channelId: string) {
  return useInfiniteQuery<ChannelAttachmentsPage>({
    queryKey: messageKeys.channelAttachments(channelId),
    queryFn: ({ pageParam }) =>
      listChannelAttachmentsApi(channelId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
    enabled: !!channelId,
  })
}

/**
 * useConversationAttachments — danh sách file trong DM conversation.
 */
export function useConversationAttachments(
  workspaceId: string,
  conversationId: string,
) {
  return useInfiniteQuery<ChannelAttachmentsPage>({
    queryKey: messageKeys.conversationAttachments(conversationId),
    queryFn: ({ pageParam }) =>
      listConversationAttachmentsApi(
        workspaceId,
        conversationId,
        pageParam as string | undefined,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
    enabled: !!workspaceId && !!conversationId,
  })
}
