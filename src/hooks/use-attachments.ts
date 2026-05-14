'use client'

import { searchAttachmentsApi, trackAttachmentViewApi } from '@/apis'
import { messageKeys } from '@/lib/query-keys'
import type { MessageAttachment } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface SearchAttachmentsFilters {
  workspaceId: string
  scope?: 'all' | 'created_by_me' | 'shared_with_me'
  categories?: string
  sort?: 'recent_viewed' | 'last_updated' | 'newest'
  userIds?: string
  channelIds?: string
  conversationIds?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
  name?: string
}

/**
 * Hook để tìm kiếm tất cả file trong workspace (Trang All Files)
 */
export function useSearchAttachments(filters: SearchAttachmentsFilters) {
  const { trackView } = useTrackAttachmentView()

  return useQuery({
    queryKey: messageKeys.allFiles(filters.workspaceId, filters),
    queryFn: async () => {
      const results = await searchAttachmentsApi(filters)
      return results
    },
    staleTime: 30 * 1000, // 30s
    enabled: !!filters.workspaceId,
  })
}

/**
 * Hook để đánh dấu đã xem file
 */
export function useTrackAttachmentView() {
  const queryClient = useQueryClient()

  const { mutate: trackView } = useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      trackAttachmentViewApi(id, workspaceId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate các query liên quan đến recent_viewed nếu cần
      console.log('trackView success', workspaceId)
      void queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'all-files'],
      })
    },
  })

  return { trackView }
}
