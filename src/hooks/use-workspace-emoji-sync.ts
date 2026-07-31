'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useSocket, useWorkspaceSocket } from '@/hooks/use-socket'
import { workspaceKeys } from '@/lib/query-keys'

/**
 * Subscribes to `entity:sync` events on the workspace room and invalidates the
 * custom-emoji cache whenever the backend broadcasts a change for `domain: 'emoji'`
 * (CREATE / UPDATE / DELETE). Custom emojis are small in count, so refetching
 * the whole page/sort/search is cheaper and safer than patching individual rows.
 *
 * Mount this once at the workspace layout level — the underlying WebSocket
 * connection is a singleton, so this hook is a thin subscriber.
 */
export function useWorkspaceEmojiSync(workspaceId: string | null) {
  const { isConnected } = useSocket()
  const queryClient = useQueryClient()

  useWorkspaceSocket(workspaceId, isConnected, {
    onEntitySync: (data) => {
      if (data.domain !== 'EMOJI') return
      const incomingWorkspaceId =
        (data.payload?.workspaceId as string | undefined) ?? null
      if (!incomingWorkspaceId || incomingWorkspaceId !== workspaceId) return

      void queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceId, 'custom-emojis-page'],
      })
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      })
    },
  })
}
