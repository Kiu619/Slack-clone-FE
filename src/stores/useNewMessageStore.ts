import { create } from 'zustand'

interface NewMessageState {
  isCreating: boolean
  openNewMessage: () => void
  closeNewMessage: () => void
}

export const useNewMessageStore = create<NewMessageState>((set) => ({
  isCreating: false,
  openNewMessage: () => set({ isCreating: true }),
  closeNewMessage: () => set({ isCreating: false }),
}))
