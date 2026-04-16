import { create } from 'zustand'
import type { Message, MessageAttachment } from '@/lib/types'

interface ThreadPanelStore {
  attachment: MessageAttachment | null
  message: Message | null
  highlightedMessageId: string | null
  isOpen: boolean
  open: (message: Message, highlightedMessageId?: string | null) => void
  setHighlightedMessageId: (id: string | null) => void
  updateMessage: (message: Partial<Message> & { id: string }) => void
  close: () => void
}

export const useThreadPanelStore = create<ThreadPanelStore>((set) => ({
  attachment: null,
  message: null,
  highlightedMessageId: null,
  isOpen: false,
  open: (message, highlightedMessageId = null) => 
    set({ isOpen: true, message, highlightedMessageId }),
  setHighlightedMessageId: (id) => set({ highlightedMessageId: id }),
  updateMessage: (updatedMessage) => set((state) => {
    if (state.message?.id === updatedMessage.id) {
      return { message: { ...state.message, ...updatedMessage } as Message }
    }
    return state
  }),
  close: () => set({ isOpen: false, attachment: null, message: null }),
}))
