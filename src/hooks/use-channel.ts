'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { Channel, CreateChannelPayload } from '@/lib/types'

// Import và re-export từ query-keys.ts (isomorphic file, không có 'use client')
// → server-fetch.ts có thể import từ query-keys.ts trực tiếp (không qua file này)
// → code ở client vẫn import từ hook file này như cũ → backward compatible
import { channelKeys } from '@/lib/query-keys'
export { channelKeys }

export function useChannels(workspaceId: string) {
  return useQuery<Channel[]>({
    queryKey: channelKeys.all(workspaceId),
    queryFn: async () => {
      const res = await apiClient.get<Channel[]>(
        `/workspaces/${workspaceId}/channels`,
      )
      return res.data
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  })
}

export function useChannel(workspaceId: string, channelId: string) {
  return useQuery<Channel>({
    queryKey: channelKeys.detail(workspaceId, channelId),
    queryFn: async () => {
      const res = await apiClient.get<Channel>(
        `/workspaces/${workspaceId}/channels/${channelId}`,
      )
      return res.data
    },
    enabled: !!workspaceId && !!channelId,
    staleTime: 60 * 1000,
  })
}

export function useCreateChannel(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateChannelPayload) => {
      const res = await apiClient.post<Channel>(
        `/workspaces/${workspaceId}/channels`,
        payload,
      )
      return res.data
    },
    onSuccess: (newChannel) => {
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => [...old, newChannel].sort((a, b) => a.name.localeCompare(b.name)),
      )
    },
  })
}

export function useDeleteChannel(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      await apiClient.delete(
        `/workspaces/${workspaceId}/channels/${channelId}`,
      )
      return channelId
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => old.filter((c) => c.id !== deletedId),
      )
    },
  })
}
