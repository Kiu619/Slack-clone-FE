'use client'

import { listChannelFoldersApi } from '@/apis'
import { folderKeys } from '@/lib/query-keys'
import { useQuery } from '@tanstack/react-query'

export function useChannelFolders(channelId: string) {
  return useQuery({
    queryKey: folderKeys.list(channelId),
    queryFn: () => listChannelFoldersApi(channelId),
    staleTime: 30_000,
  })
}
