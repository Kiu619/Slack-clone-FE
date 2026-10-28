import { create } from 'zustand'

interface NewMessageState {
  isCreating: boolean
  setIsCreating: (v: boolean) => void
}

export const useNewMessageStore = create<NewMessageState>((set) => ({
  isCreating: false,
  setIsCreating: (v) => set({ isCreating: v }),
}))
