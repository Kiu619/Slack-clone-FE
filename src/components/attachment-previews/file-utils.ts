import type { MessageAttachment } from "@/lib/types"

const CODE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'json', 'css', 'scss', 'sass', 'less',
  'md', 'mdx', 'sh', 'bash', 'zsh',
  'sql', 'py', 'yaml', 'yml', 'xml', 'html', 'htm', 'svg',
  'txt', 'csv', 'env', 'config', 'conf', 'ini', 'log',
  'java', 'kt', 'swift', 'go', 'rs', 'rb', 'php', 'c', 'cpp', 'h', 'hpp',
])

const OFFICE_EXTENSIONS = new Set([
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
])

const PDF_EXTENSIONS = new Set(['pdf'])

export type AttachmentPreviewKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'office'
  | 'pdf'
  | 'code'
  | 'other'

function getNormalizedAttachmentType(
  attachment: Pick<MessageAttachment, 'type'>,
): 'image' | 'video' | 'audio' | 'file' | null {
  const type = attachment.type?.toLowerCase()
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'file') {
    return type
  }
  return null
}

function getNormalizedMimeType(
  attachment: Pick<MessageAttachment, 'mimeType'>,
): string {
  return (attachment.mimeType ?? '').toLowerCase()
}

export function isCodeOrTextFile(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (CODE_EXTENSIONS.has(ext)) return true
  if (mimeType?.startsWith('text/')) return true
  if (mimeType === 'application/json') return true
  return false
}

export function isOfficeFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  return OFFICE_EXTENSIONS.has(ext)
}

export function isPdfFile(fileName: string, mimeType?: string | null): boolean {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (PDF_EXTENSIONS.has(ext)) return true
  if (mimeType === 'application/pdf') return true
  return false
}

export function isImageAttachment(
  attachment: Pick<MessageAttachment, 'type' | 'mimeType'>,
): boolean {
  const normalizedType = getNormalizedAttachmentType(attachment)
  if (normalizedType === 'image') return true
  return getNormalizedMimeType(attachment).startsWith('image/')
}

export function isVideoAttachment(
  attachment: Pick<MessageAttachment, 'type' | 'mimeType'>,
): boolean {
  const normalizedType = getNormalizedAttachmentType(attachment)
  if (normalizedType === 'video') return true
  return getNormalizedMimeType(attachment).startsWith('video/')
}

export function isAudioAttachment(
  attachment: Pick<MessageAttachment, 'type' | 'mimeType'>,
): boolean {
  const normalizedType = getNormalizedAttachmentType(attachment)
  if (normalizedType === 'audio') return true
  return getNormalizedMimeType(attachment).startsWith('audio/')
}

export function getAttachmentPreviewKind(
  attachment: Pick<MessageAttachment, 'type' | 'mimeType' | 'name'>,
): AttachmentPreviewKind {
  if (isImageAttachment(attachment)) return 'image'
  if (isVideoAttachment(attachment)) return 'video'
  if (isAudioAttachment(attachment)) return 'audio'
  if (isOfficeFile(attachment.name)) return 'office'
  if (isPdfFile(attachment.name, attachment.mimeType)) return 'pdf'
  if (isCodeOrTextFile(attachment.name, attachment.mimeType)) return 'code'
  return 'other'
}
