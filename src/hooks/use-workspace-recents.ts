'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getWorkspaceRecentsApi,
  postWorkspaceRecentVisitApi,
  type WorkspaceRecentsResponse,
} from '@/apis'
import { workspaceKeys } from '@/lib/query-keys'

type RecentVisitInput = { kind: 'channel' | 'dm'; id: string }
type RecentVisitStatus =
  | { state: 'pending'; promise: Promise<WorkspaceRecentsResponse> }

const recentVisitRegistry = new Map<string, RecentVisitStatus>()
const lastRecordedRecentByWorkspace = new Map<string, string>()

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

  const mutation = useMutation({
    mutationFn: (input: RecentVisitInput) => postWorkspaceRecentVisitApi(workspaceId!, input),
    onSuccess: (data: WorkspaceRecentsResponse) => {
      if (!workspaceId) return
      queryClient.setQueryData(workspaceKeys.recents(workspaceId), data)
    },
  })

  const { mutateAsync } = mutation

  const recordVisit = useCallback(
    async (input: RecentVisitInput) => {
      if (!workspaceId) return
      const nextKey = `${workspaceId}:${input.kind}:${input.id}`
      const existing = recentVisitRegistry.get(nextKey)

      if (existing?.state === 'pending') {
        await existing.promise
        return
      }

      if (lastRecordedRecentByWorkspace.get(workspaceId) === nextKey) {
        return
      }

      const request = mutateAsync(input)
      recentVisitRegistry.set(nextKey, { state: 'pending', promise: request })

      try {
        await request
        recentVisitRegistry.delete(nextKey)
        lastRecordedRecentByWorkspace.set(workspaceId, nextKey)
      } catch (error) {
        recentVisitRegistry.delete(nextKey)
        throw error
      }
    },
    [workspaceId, mutateAsync],
  )

  return {
    ...mutation,
    recordVisit,
  }
}
