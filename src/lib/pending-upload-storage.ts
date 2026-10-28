'use client'

import type { MessageAttachment } from '@/lib/types'

/**
 * Lưu các pending upload (upload fail / chưa hoàn tất) vào localStorage để
 * khi user refresh/mở lại tab, có thể retry mà không mất file.
 *
 * Schema (versioned để tránh conflict khi schema thay đổi):
 * ```
 * {
 *   version: 1,
 *   entries: [
 *     { messageId, pendingUploadId, fileName, mimeType, size, savedAt }
 *   ]
 * }
 * ```
 */

const STORAGE_KEY = 'pendingAttachmentUploads:v1'

export interface PendingUploadEntry {
  messageId: string
  pendingUploadId: string
  fileName: string
  mimeType?: string
  size?: number
  /** ISO timestamp khi lưu. */
  savedAt: string
}

interface PendingUploadStorageShape {
  version: 1
  entries: PendingUploadEntry[]
}

function readStorage(): PendingUploadStorageShape {
  if (typeof window === 'undefined') {
    return { version: 1, entries: [] }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, entries: [] }
    const parsed = JSON.parse(raw) as PendingUploadStorageShape
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) {
      return { version: 1, entries: [] }
    }
    return parsed
  } catch {
    return { version: 1, entries: [] }
  }
}

function writeStorage(shape: PendingUploadStorageShape) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape))
  } catch {
    /* quota exceeded / private browsing — ignore */
  }
}

/**
 * Thêm 1 entry vào danh sách pending uploads (idempotent — trùng pendingUploadId thì skip).
 */
export function addPendingUploadEntry(entry: PendingUploadEntry): void {
  const shape = readStorage()
  if (
    shape.entries.some(
      (e) =>
        e.messageId === entry.messageId &&
        e.pendingUploadId === entry.pendingUploadId,
    )
  ) {
    return
  }
  shape.entries.push(entry)
  writeStorage(shape)
}

/**
 * Xóa 1 entry khỏi danh sách pending uploads (gọi khi upload thành công hoặc user cancel).
 */
export function removePendingUploadEntry(
  messageId: string,
  pendingUploadId: string,
): void {
  const shape = readStorage()
  const next = shape.entries.filter(
    (e) => !(e.messageId === messageId && e.pendingUploadId === pendingUploadId),
  )
  if (next.length !== shape.entries.length) {
    writeStorage({ ...shape, entries: next })
  }
}

/**
 * Lấy tất cả pending uploads trong localStorage.
 */
export function listPendingUploadEntries(): PendingUploadEntry[] {
  return readStorage().entries
}

/**
 * Helper: xác định attachment có đang pending upload không.
 * (Dùng để preview components render placeholder khi refresh mà file vẫn đang pending.)
 */
export function isAttachmentPendingUpload(
  attachment: {
    url?: string | null
    pendingUploadId?: string | null
    uploadId?: string
    uploadStatus?: MessageAttachment['uploadStatus']
  },
): boolean {
  if (attachment.url) return false
  if (
    attachment.uploadStatus === 'uploading' ||
    attachment.uploadStatus === 'pending'
  ) {
    return true
  }
  if (attachment.uploadId || attachment.pendingUploadId) {
    return true
  }
  return false
}
