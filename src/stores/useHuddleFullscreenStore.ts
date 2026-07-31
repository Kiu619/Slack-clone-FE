import { create } from 'zustand'
import type { LocalParticipant, RemoteParticipant } from 'livekit-client'

export type HuddleFullscreenPayload = {
  sessionKey: string
  participant: LocalParticipant | RemoteParticipant
  displayName: string
  avatarSrc: string | null
  avatarLabel: string
  onClose?: () => void
}

interface HuddleFullscreenStoreState {
  payload: HuddleFullscreenPayload | null
  open: (p: HuddleFullscreenPayload) => void
  close: () => void
}

export const useHuddleFullscreenStore = create<HuddleFullscreenStoreState>((set) => ({
  payload: null,
  open: (p) => set({ payload: p }),
  close: () => set({ payload: null }),
}))
