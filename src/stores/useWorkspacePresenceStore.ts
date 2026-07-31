import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type WorkspacePresenceState = {
  /** Socket-connected presence only: userId -> connected in workspace */
  byWorkspace: Record<string, Record<string, boolean>>
  setWorkspaceSnapshot: (workspaceId: string, connectedUserIds: string[]) => void
  setUserPresence: (workspaceId: string, userId: string, isConnected: boolean) => void
  resetWorkspace: (workspaceId: string) => void
}

export const useWorkspacePresenceStore = create<WorkspacePresenceState>((set) => ({
  byWorkspace: {},
  setWorkspaceSnapshot: (workspaceId, connectedUserIds) => {
    const nextMap = Object.fromEntries(connectedUserIds.map((id) => [id, true]))
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: nextMap,
      },
    }))
  },
  setUserPresence: (workspaceId, userId, isConnected) => {
    set((state) => {
      const prevMap = state.byWorkspace[workspaceId] || {}
      const nextMap = { ...prevMap }
      if (isConnected) {
        nextMap[userId] = true
      } else {
        delete nextMap[userId]
      }
      return {
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: nextMap,
        },
      }
    })
  },
  resetWorkspace: (workspaceId) => {
    set((state) => {
      const rest = { ...state.byWorkspace }
      delete rest[workspaceId]
      return { byWorkspace: rest }
    })
  },
}))

export function useWorkspaceUserSocketPresence(
  workspaceId: string,
  userId: string | undefined | null,
) {
  return useWorkspacePresenceStore(
    useShallow((s) => Boolean(userId && s.byWorkspace[workspaceId]?.[userId])),
  )
}

/**
 * Legacy alias. This name can still be misleading as "final online",
 * but in practice it only returns socket-connected presence.
 */
export function useWorkspaceUserPresence(
  workspaceId: string,
  userId: string | undefined | null,
) {
  return useWorkspaceUserSocketPresence(workspaceId, userId)
}
