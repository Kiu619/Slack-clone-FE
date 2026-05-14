'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getWorkspaceRecentsApi,
  postWorkspaceRecentVisitApi,
  type WorkspaceRecentsResponse,
} from '@/apis'
import { workspaceKeys } from '@/lib/query-keys'

export function useWorkspaceRecents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.recents(workspaceId ?? ''),
    queryFn: () => getWorkspaceRecentsApi(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
}

export function useRecordRecentVisit(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { kind: 'channel' | 'dm'; id: string }) =>
      postWorkspaceRecentVisitApi(workspaceId!, input),
    onSuccess: (data: WorkspaceRecentsResponse) => {
      if (!workspaceId) return
      queryClient.setQueryData(workspaceKeys.recents(workspaceId), data)
    },
  })
}
