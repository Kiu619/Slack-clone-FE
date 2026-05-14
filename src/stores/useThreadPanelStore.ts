import { create } from 'zustand'
import type { Message } from '@/lib/types'
import { useMessageStore } from './useMessageStore'

interface ThreadPanelStore {
  messageId: string | null
  highlightedMessageId: string | null
  activeSavedItemId: string | null
  isOpen: boolean
  
  // Actions
  open: (message: Message, highlightedMessageId?: string | null) => void
  setHighlightedMessageId: (id: string | null) => void
  setActiveSavedItemId: (id: string | null) => void
  updateMessage: (message: Partial<Message> & { id: string }) => void // Vẫn giữ để cập nhật nhanh, nhưng thực tế nên dùng sync hook
  close: () => void
}

export const useThreadPanelStore = create<ThreadPanelStore>((set) => ({
  messageId: null,
  highlightedMessageId: null,
  activeSavedItemId: null,
  isOpen: false,
  
  open: (message, highlightedMessageId = null) => {
    // Đảm bảo tin nhắn được đẩy vào kho tổng
    useMessageStore.getState().upsertEntities([message])
    set({ isOpen: true, messageId: message.id, highlightedMessageId })
  },
  
  setHighlightedMessageId: (id) => set({ highlightedMessageId: id }),
  setActiveSavedItemId: (id) => set({ activeSavedItemId: id }),
  
  updateMessage: (updatedMessage) => {
    // Cập nhật thẳng vào kho tổng
    useMessageStore.getState().updateEntity(updatedMessage.id, updatedMessage)
  },
  
  close: () => set({ isOpen: false, messageId: null, activeSavedItemId: null }),
}))
