import { create } from 'zustand'
import type { HuddleTarget } from '@/lib/huddle'

interface CurrentHuddle {
  target: HuddleTarget
  label: string
  topic: string | null
}

interface CurrentHuddleStore {
  currentHuddle: CurrentHuddle | null
  setCurrentHuddle: (huddle: CurrentHuddle) => void
  setTopic: (topic: string | null) => void
  clearCurrentHuddle: () => void
}

export const useCurrentHuddleStore = create<CurrentHuddleStore>((set) => ({
  currentHuddle: null,
  setCurrentHuddle: (huddle) => set({ currentHuddle: huddle }),
  setTopic: (topic) =>
    set((state) => ({
      currentHuddle: state.currentHuddle
        ? { ...state.currentHuddle, topic }
        : null,
    })),
  clearCurrentHuddle: () => set({ currentHuddle: null }),
}))
