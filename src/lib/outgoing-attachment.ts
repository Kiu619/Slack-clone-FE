import type { MessageAttachment } from '@/lib/types'

export type OutgoingMessageAttachment = {
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  name: string
  size: number
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  fileCategory?: string
}

function normalizeAttachmentType(t: string): OutgoingMessageAttachment['type'] {
  if (t === 'image' || t === 'video' || t === 'audio' || t === 'file') return t
  return 'file'
}

/** Map an existing attachment row to the body shape for POST .../messages (new rows on server). */
export function attachmentToOutgoingSendPayload(a: MessageAttachment): OutgoingMessageAttachment {
  const out: OutgoingMessageAttachment = {
    url: a.url,
    type: normalizeAttachmentType(a.type),
    name: a.name,
    size: a.size,
  }
  if (a.mimeType) out.mimeType = a.mimeType
  if (a.width != null) out.width = a.width
  if (a.height != null) out.height = a.height
  if (a.duration != null) out.duration = a.duration
  if (a.fileCategory) out.fileCategory = a.fileCategory
  return out
}
