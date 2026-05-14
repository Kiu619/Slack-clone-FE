'use client'

import { listFolderAttachmentsApi } from '@/apis'
import { folderKeys } from '@/lib/query-keys'
import type { ChannelAttachmentsPage } from '@/lib/types'
import { useInfiniteQuery } from '@tanstack/react-query'

export function useFolderAttachments(
  targetId: string,
  folderId: string | null,
  isDM = false,
) {
  return useInfiniteQuery<ChannelAttachmentsPage>({
    queryKey: folderKeys.attachments(targetId, folderId ?? '_'),
    queryFn: ({ pageParam }) =>
      listFolderAttachmentsApi(
        targetId,
        folderId!,
        pageParam as string | undefined,
        isDM,
      ),
    enabled: !!targetId && !!folderId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
  })
}
