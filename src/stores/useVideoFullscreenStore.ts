import { create } from 'zustand'
import type { Message, MessageAttachment } from '@/lib/types'

export type VideoFullscreenPayload = {
  sessionKey: string
  message: Message
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  startTime: number
  wasPlaying: boolean
  volume: number
  muted: boolean
  playbackRate: number
}

type LastResume = {
  messageId: string
  attachmentId: string
  time: number
  play: boolean
}

interface VideoFullscreenStoreState {
  payload: VideoFullscreenPayload | null
  lastInlineResume: LastResume | null
  open: (p: VideoFullscreenPayload) => void
  closeFromPortal: (resume: { time: number; play: boolean }) => void
  consumeLastInlineResume: () => void
}

export const useVideoFullscreenStore = create<VideoFullscreenStoreState>(
  (set, get) => ({
    payload: null,
    lastInlineResume: null,
    open: (p) => set({ payload: p }),
    closeFromPortal: (resume) => {
      const cur = get().payload
      if (!cur) return
      set({
        payload: null,
        lastInlineResume: {
          messageId: cur.message.id,
          attachmentId: cur.attachment.id,
          time: resume.time,
          play: resume.play,
        },
      })
    },
    consumeLastInlineResume: () => set({ lastInlineResume: null }),
  }),
)
