import { setLastDmConversationId } from '@/lib/last-dm-storage'
import { create } from 'zustand'

export type MainPanelView =
  | { type: 'route' }
  | { type: 'channel'; channelId: string }
  | { type: 'dm'; conversationId: string }

function workspaceIdFromBrowserPath(): string | null {
  if (typeof window === 'undefined') return null
  const m = window.location.pathname.match(/^\/workspace\/([^/]+)/)
  return m?.[1] ?? null
}

interface MainPanelStore {
  view: MainPanelView
  activeSavedItemId: string | null
  setView: (view: MainPanelView) => void
  setActiveSavedItemId: (id: string | null) => void
  reset: () => void
}

export const useMainPanelStore = create<MainPanelStore>((set) => ({
  view: { type: 'route' },
  activeSavedItemId: null,
  setView: (view) => {
    set({ view, activeSavedItemId: null })
    if (view.type === 'dm') {
      const ws = workspaceIdFromBrowserPath()
      if (ws) setLastDmConversationId(ws, view.conversationId)
    }
  },
  setActiveSavedItemId: (id) => set({ activeSavedItemId: id }),
  reset: () => set({ view: { type: 'route' }, activeSavedItemId: null }),
}))
