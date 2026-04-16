import { create } from 'zustand'

interface MessageFocusStore {
  focusedMessageId: string | null
  setFocusedMessageId: (id: string | null) => void
}

export const useMessageFocusStore = create<MessageFocusStore>((set) => ({
  focusedMessageId: null,
  setFocusedMessageId: (id) => set({ focusedMessageId: id }),
}))
