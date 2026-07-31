'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import {
  updateChannelApi,
  starChannelApi,
  unstarChannelApi,
} from '@/apis'
import type { Channel, CreateChannelPayload, UpdateChannelPayload } from '@/lib/types'
import { getMainGatewaySocket } from '@/hooks/use-socket'

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
        (old = []) =>
          [...old, { ...newChannel, starredAt: newChannel.starredAt ?? null }].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
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

export function useUpdateChannel(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateChannelPayload) =>
      updateChannelApi(workspaceId, channelId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Channel>(
        channelKeys.detail(workspaceId, channelId),
        updated,
      )
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => {
          const next = old.map((c) => (c.id === channelId ? updated : c))
          return next.sort((a, b) => a.name.localeCompare(b.name))
        },
      )
    },
  })
}

/** Star / unstar channel — đồng bộ list + detail cache */
export function useStarChannel(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nextStarred: boolean) => {
      const s = getMainGatewaySocket()
      const headers =
        s.connected && s.id ? { 'x-socket-id': s.id } : undefined
      return nextStarred
        ? starChannelApi(workspaceId, channelId, headers)
        : unstarChannelApi(workspaceId, channelId, headers)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Channel>(
        channelKeys.detail(workspaceId, channelId),
        updated,
      )
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => {
          const next = old.map((c) => (c.id === channelId ? updated : c))
          return next.sort((a, b) => a.name.localeCompare(b.name))
        },
      )
    },
  })
}

export function useChannelMembers(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: channelKeys.members(workspaceId, channelId, ''),
    queryFn: () => apiClient.get(`/workspaces/${workspaceId}/channels/${channelId}/members`).then(res => res.data),
    enabled: !!workspaceId && !!channelId,
  })
}
