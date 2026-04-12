'use client'

import { listFolderAttachmentsApi } from '@/apis'
import { folderKeys } from '@/lib/query-keys'
import type { ChannelAttachmentsPage } from '@/lib/types'
import { useInfiniteQuery } from '@tanstack/react-query'

export function useFolderAttachments(
  channelId: string,
  folderId: string | null,
) {
  return useInfiniteQuery<ChannelAttachmentsPage>({
    queryKey: folderKeys.attachments(channelId, folderId ?? '_'),
    queryFn: ({ pageParam }) =>
      listFolderAttachmentsApi(
        channelId,
        folderId!,
        pageParam as string | undefined,
      ),
    enabled: !!channelId && !!folderId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
  })
}
