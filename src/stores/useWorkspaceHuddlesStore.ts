import { create } from 'zustand'
import type { HuddleStateSnapshot, HuddleTarget } from '@/lib/huddle'

interface WorkspaceHuddleEntry {
  target: HuddleTarget
  state: HuddleStateSnapshot
}

interface WorkspaceHuddlesStore {
  /** Key format: "channel:{entityId}" or "dm:{entityId}" */
  huddlesByEntity: Record<string, WorkspaceHuddleEntry>
  setHuddle: (workspaceId: string, entityType: 'channel' | 'dm', entityId: string, target: HuddleTarget, state: HuddleStateSnapshot) => void
  clearHuddle: (workspaceId: string, entityType: 'channel' | 'dm', entityId: string) => void
  clearWorkspace: (workspaceId: string) => void
}

function makeKey(entityType: 'channel' | 'dm', entityId: string) {
  return `${entityType}:${entityId}`
}

export const useWorkspaceHuddlesStore = create<WorkspaceHuddlesStore>((set) => ({
  huddlesByEntity: {},

  setHuddle: (workspaceId, entityType, entityId, target, state) =>
    set((prev) => ({
      huddlesByEntity: {
        ...prev.huddlesByEntity,
        [makeKey(entityType, entityId)]: { target, state },
      },
    })),

  clearHuddle: (workspaceId, entityType, entityId) =>
    set((prev) => {
      const key = makeKey(entityType, entityId)
      if (!(key in prev.huddlesByEntity)) return prev
      const next = { ...prev.huddlesByEntity }
      delete next[key]
      return { huddlesByEntity: next }
    }),

  clearWorkspace: (workspaceId) =>
    set((prev) => {
      const next: Record<string, WorkspaceHuddleEntry> = {}
      for (const [key, entry] of Object.entries(prev.huddlesByEntity)) {
        if (entry.target.workspaceId !== workspaceId) {
          next[key] = entry
        }
      }
      return { huddlesByEntity: next }
    }),
}))
