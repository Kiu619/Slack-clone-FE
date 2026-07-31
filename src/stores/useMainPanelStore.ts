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

function browserPathname(): string | null {
  if (typeof window === 'undefined') return null
  return window.location.pathname
}

interface MainPanelStore {
  view: MainPanelView
  viewPathname: string | null
  activeSavedItemId: string | null
  activeSearchResultId: string | null
  setView: (view: MainPanelView) => void
  setActiveSavedItemId: (id: string | null) => void
  setActiveSearchResultId: (id: string | null) => void
  reset: () => void
}

export const useMainPanelStore = create<MainPanelStore>((set) => ({
  view: { type: 'route' },
  viewPathname: null,
  activeSavedItemId: null,
  activeSearchResultId: null,
  setView: (view) => {
    set({ view, viewPathname: browserPathname(), activeSavedItemId: null })
    if (view.type === 'dm') {
      const ws = workspaceIdFromBrowserPath()
      if (ws) setLastDmConversationId(ws, view.conversationId)
    }
  },
  setActiveSavedItemId: (id) => set({ activeSavedItemId: id }),
  setActiveSearchResultId: (id) => set({ activeSearchResultId: id }),
  reset: () =>
    set({
      view: { type: 'route' },
      viewPathname: null,
      activeSavedItemId: null,
      activeSearchResultId: null,
    }),
}))
