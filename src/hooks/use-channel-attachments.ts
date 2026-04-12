'use client'

import { listChannelAttachmentsApi } from '@/apis'
import { useChannelSocket } from '@/hooks/use-socket'
import { messageKeys } from '@/lib/query-keys'
import type { ChannelAttachmentsPage, Message } from '@/lib/types'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

/**
 * useChannelAttachments — danh sách file trong channel (REST + phân trang),
 * đồng bộ coarse-grained qua WebSocket (invalidate khi có file thêm/xóa / message xóa / message có đính kèm).
 */
export function useChannelAttachments(channelId: string, isConnected: boolean) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery<ChannelAttachmentsPage>({
    queryKey: messageKeys.channelAttachments(channelId),
    queryFn: ({ pageParam }) =>
      listChannelAttachmentsApi(channelId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 10 * 1000,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: messageKeys.channelAttachments(channelId),
    })
  }, [channelId, queryClient])

  const socketCallbacks = useMemo(
    () => ({
      onMessage: (newMessage: unknown) => {
        const msg = newMessage as Message
        if (msg.attachments?.length) invalidate()
      },
      onMessageDeleted: () => {
        invalidate()
      },
      onAttachmentAdded: () => {
        invalidate()
      },
      onAttachmentDeleted: () => {
        invalidate()
      },
    }),
    [invalidate],
  )

  useChannelSocket(channelId, isConnected, socketCallbacks)

  return query
}
