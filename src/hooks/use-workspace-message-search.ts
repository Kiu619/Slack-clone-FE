'use client'

import { searchWorkspaceMessagesApi, type SearchWorkspaceMessagesParams } from '@/apis'
import { messageKeys } from '@/lib/query-keys'
import type { WorkspaceMessageSearchResponse } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'

export function useWorkspaceMessageSearch(params: SearchWorkspaceMessagesParams) {
  return useQuery<WorkspaceMessageSearchResponse>({
    queryKey: messageKeys.workspaceSearch(params.workspaceId, params),
    queryFn: () => searchWorkspaceMessagesApi(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  })
}
