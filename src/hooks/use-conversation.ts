'use client'

import {
  addConversationMembersApi,
  starConversationApi,
  unstarConversationApi,
  updateConversationApi,
} from '@/apis'
import { apiClient } from '@/lib/axios'
import { messageKeys } from '@/lib/query-keys'
import type {
  DirectMessageConversation,
  UpdateConversationPayload,
} from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMainGatewaySocket } from '@/hooks/use-socket'

export function useConversation(workspaceId: string, conversationId: string) {
  return useQuery<DirectMessageConversation>({
    queryKey: messageKeys.conversationDetail(conversationId),
    queryFn: async () => {
      const res = await apiClient.get<DirectMessageConversation>(
        `/workspaces/${workspaceId}/direct-messages/${conversationId}`,
      )
      return res.data
    },
    enabled: !!workspaceId && !!conversationId,
    staleTime: 60 * 1000,
  })
}

export function useUpdateConversation(
  workspaceId: string,
  conversationId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateConversationPayload) =>
      updateConversationApi(workspaceId, conversationId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<DirectMessageConversation>(
        messageKeys.conversationDetail(conversationId),
        updated,
      )
      queryClient.setQueriesData<DirectMessageConversation[]>(
        { queryKey: messageKeys.conversations(workspaceId), exact: false },
        (old) => {
          if (!old) return old
          return old.map((c) => (c.id === conversationId ? updated : c))
        },
      )
    },
  })
}

/** Star / unstar DM — đồng bộ detail + mọi biến thể list cache (có `q`) */
export function useStarConversation(
  workspaceId: string,
  conversationId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nextStarred: boolean) => {
      const s = getMainGatewaySocket()
      const headers =
        s.connected && s.id ? { 'x-socket-id': s.id } : undefined
      return nextStarred
        ? starConversationApi(workspaceId, conversationId, headers)
        : unstarConversationApi(workspaceId, conversationId, headers)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DirectMessageConversation>(
        messageKeys.conversationDetail(conversationId),
        updated,
      )
      queryClient.setQueriesData<DirectMessageConversation[]>(
        { queryKey: messageKeys.conversations(workspaceId), exact: false },
        (old) => {
          if (!old) return old
          return old.map((c) => (c.id === conversationId ? updated : c))
        },
      )
    },
  })
}

function patchConversationCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  conversationId: string,
  updated: DirectMessageConversation,
) {
  queryClient.setQueryData<DirectMessageConversation>(
    messageKeys.conversationDetail(conversationId),
    updated,
  )
  queryClient.setQueriesData<DirectMessageConversation[]>(
    { queryKey: messageKeys.conversations(workspaceId), exact: false },
    (old) => {
      if (!old) return old
      return old.map((c) => (c.id === conversationId ? updated : c))
    },
  )
  void queryClient.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey
      return (
        Array.isArray(k) &&
        k[0] === 'dm-conversations' &&
        k[1] === 'invite-candidates' &&
        k[2] === conversationId
      )
    },
  })
}

export function useAddConversationMembers(
  workspaceId: string,
  conversationId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userIds: string[]) =>
      addConversationMembersApi(workspaceId, conversationId, userIds),
    onSuccess: (updated) => {
      patchConversationCaches(queryClient, workspaceId, conversationId, updated)
    },
  })
}
