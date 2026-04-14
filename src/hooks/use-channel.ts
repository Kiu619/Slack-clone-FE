'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { apiClient } from '@/lib/axios'
import { updateChannelApi } from '@/apis'
import type { Channel, CreateChannelPayload, UpdateChannelPayload } from '@/lib/types'
import {
  useChannelWorkspaceSocket,
  type ChannelSocketPayload,
  type ChannelDeletedSocketPayload,
  type ChannelMembershipChangedPayload,
} from '@/hooks/use-socket'
import { useUserStore } from '@/stores/useUserStore'

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

/**
 * WebSocket /channel (room workspace):
 * - created: không merge vào sidebar (chỉ người tạo thấy qua mutation; người khác chỉ khi được thêm member).
 * - updated: cập nhật chi tiết + sidebar chỉ nếu channel đã có trong cache (đã là member).
 * - deleted / membership: giữ như cũ.
 */
export function useWorkspaceChannelSocket(
  workspaceId: string,
  isChannelConnected: boolean,
) {
  const queryClient = useQueryClient()
  const currentUserId = useUserStore((s) => s.user?.id)

  const onChannelCreated = useCallback(() => {
    // Không cập nhật channelKeys.all — tránh hiện channel mới trên máy user chưa được thêm.
  }, [])

  const onChannelUpdated = useCallback(
    (data: ChannelSocketPayload) => {
      if (data.workspaceId !== workspaceId) return
      const ch = data.channel as Channel
      queryClient.setQueryData<Channel>(
        channelKeys.detail(workspaceId, ch.id),
        ch,
      )
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => {
          if (!old.some((c) => c.id === ch.id)) return old
          return [...old.map((c) => (c.id === ch.id ? ch : c))].sort((a, b) =>
            a.name.localeCompare(b.name),
          )
        },
      )
    },
    [workspaceId, queryClient],
  )

  const onChannelDeleted = useCallback(
    (data: ChannelDeletedSocketPayload) => {
      if (data.workspaceId !== workspaceId) return
      queryClient.removeQueries({
        queryKey: channelKeys.detail(workspaceId, data.channelId),
      })
      queryClient.setQueryData<Channel[]>(
        channelKeys.all(workspaceId),
        (old = []) => old.filter((c) => c.id !== data.channelId),
      )
    },
    [workspaceId, queryClient],
  )

  const onChannelMembershipChanged = useCallback(
    (data: ChannelMembershipChangedPayload) => {
      if (data.workspaceId !== workspaceId) return

      void queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey
          return (
            Array.isArray(k) &&
            k[0] === 'channels' &&
            k[1] === workspaceId &&
            k[2] === data.channelId &&
            k[3] === 'members'
          )
        },
      })

      if (data.affectedUserId === currentUserId) {
        void queryClient.invalidateQueries({
          queryKey: channelKeys.all(workspaceId),
        })
        void queryClient.invalidateQueries({
          queryKey: channelKeys.detail(workspaceId, data.channelId),
        })
      }
    },
    [workspaceId, queryClient, currentUserId],
  )

  const callbacks = useMemo(
    () => ({
      onChannelCreated,
      onChannelUpdated,
      onChannelDeleted,
      onChannelMembershipChanged,
    }),
    [
      onChannelCreated,
      onChannelUpdated,
      onChannelDeleted,
      onChannelMembershipChanged,
    ],
  )

  useChannelWorkspaceSocket(workspaceId || null, isChannelConnected, callbacks)
}
