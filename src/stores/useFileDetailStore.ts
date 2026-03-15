import { create } from 'zustand'
import type { Message, MessageAttachment } from '@/lib/types'

interface FileDetailStore {
  attachment: MessageAttachment | null
  message: Message | null
  isOpen: boolean
  open: ({ attachment, message }: { attachment: MessageAttachment, message: Message }) => void
  close: () => void
}

export const useFileDetailStore = create<FileDetailStore>((set) => ({
  attachment: null,
  message: null,
  isOpen: false,
  open: ({ attachment, message }) => set({ attachment, message, isOpen: true }),
  close: () => set({ isOpen: false, attachment: null, message: null }),
}))
