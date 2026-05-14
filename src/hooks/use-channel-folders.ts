'use client'

import { listChannelFoldersApi } from '@/apis'
import { folderKeys } from '@/lib/query-keys'
import { useQuery } from '@tanstack/react-query'

export function useChannelFolders(targetId: string, isDM = false) {
  return useQuery({
    queryKey: folderKeys.list(targetId),
    queryFn: () => listChannelFoldersApi(targetId, isDM),
    staleTime: 30_000,
  })
}
