import { create } from "zustand"
import type { Message } from "@/lib/types"
import { useMessageStore } from "./useMessageStore"
import { useProfilePanelStore } from "./useProfilePanelStore"

interface ThreadPanelStore {
  messageId: string | null
  highlightedMessageId: string | null
  activeSavedItemId: string | null
  activeSearchResultId: string | null
  isOpen: boolean

  open: (message: Message, highlightedMessageId?: string | null) => void
  setHighlightedMessageId: (id: string | null) => void
  setActiveSavedItemId: (id: string | null) => void
  setActiveSearchResultId: (id: string | null) => void
  updateMessage: (message: Partial<Message> & { id: string }) => void
  close: () => void
}

export const useThreadPanelStore = create<ThreadPanelStore>((set) => ({
  messageId: null,
  highlightedMessageId: null,
  activeSavedItemId: null,
  activeSearchResultId: null,
  isOpen: false,

  open: (message, highlightedMessageId = null) => {
    useMessageStore.getState().upsertEntities([message])
    // Close profile panel when opening thread (mutual exclusion)
    useProfilePanelStore.getState().close()
    set({ isOpen: true, messageId: message.id, highlightedMessageId })
  },

  setHighlightedMessageId: (id) => set({ highlightedMessageId: id }),
  setActiveSavedItemId: (id) => set({ activeSavedItemId: id }),
  setActiveSearchResultId: (id) => set({ activeSearchResultId: id }),

  updateMessage: (updatedMessage) => {
    useMessageStore.getState().updateEntity(updatedMessage.id, updatedMessage)
  },

  close: () =>
    set({
      isOpen: false,
      messageId: null,
      activeSavedItemId: null,
      activeSearchResultId: null,
    }),
}))
