'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { Workspace, CreateWorkspacePayload } from '@/lib/types'

// Import và re-export từ query-keys.ts (isomorphic file, không có 'use client')
// → server-fetch.ts có thể import từ query-keys.ts trực tiếp (không qua file này)
// → code ở client vẫn import từ hook file này như cũ → backward compatible
import { workspaceKeys } from '@/lib/query-keys'
export { workspaceKeys }

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: workspaceKeys.all,
    queryFn: async () => {
      const res = await apiClient.get<Workspace[]>('/workspaces')
      return res.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useWorkspace(id: string, initialData?: Workspace) {
  return useQuery<Workspace>({
    queryKey: workspaceKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<Workspace>(`/workspaces/${id}`)
      return res.data
    },
    enabled: !!id,
    initialData,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateWorkspacePayload) => {
      const res = await apiClient.post<Workspace>('/workspaces', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
    },
  })
}

export function useJoinWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiClient.post<Workspace>('/workspaces/join', {
        inviteCode,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
    },
  })
}
