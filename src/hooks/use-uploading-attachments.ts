'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  registerComposerScope,
  unregisterComposerScope,
  setComposerScopeState,
  getComposerScopeState,
} from '@/lib/upload-scope'
import { useFileUpload, type UploadingFile } from '@/hooks/use-file-upload'

export type UploadingAttachmentInfo = {
  uploadId: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * useUploadingAttachments — central hub cho upload state.
 *
 * - Khi mount: register shared scope để nhận updates từ useMessageComposer.
 * - Dùng bên trong UploadingAttachmentsProvider để cung cấp retry + reading cho attachment bubble.
 * - useMessageComposer dùng setComposerScopeState() để thông báo khi upload state đổi.
 */
export function useUploadingAttachments() {
  // Local state để trigger re-render khi scope đổi
  const [scopeFiles, setScopeFiles] = useState<UploadingFile[]>(() => getComposerScopeState())

  // useFileUpload để có logic upload thật
  const { uploadingFiles: localFiles, uploadFileBinary: rawUploadBinary } = useFileUpload()

  // Register shared scope khi mount, unregister khi unmount
  useEffect(() => {
    registerComposerScope(setScopeFiles)
    return () => unregisterComposerScope()
  }, [])

  // Sync: khi localFiles đổi (do upload) → thông báo cho scope
  useEffect(() => {
    setComposerScopeState(localFiles)
  }, [localFiles])

  // Dùng scopeFiles làm source of truth cho consumers (attachment bubble, retry)
  const byUploadId = useMemo(() => {
    const m = new Map<string, UploadingAttachmentInfo>()
    for (const f of scopeFiles) {
      m.set(f.id, {
        uploadId: f.id,
        file: f.file,
        progress: f.progress,
        status: f.status,
        error: f.error,
      })
    }
    return m
  }, [scopeFiles])

  /**
   * Retry upload 1 file đã fail.
   * Gọi uploadFileBinary (từ useFileUpload) — tạo entry mới trong uploadingFiles.
   * Consumer tự gọi updateAttachmentInMessageCache sau khi xong.
   */
  const retry = useCallback(
    async (file: File) => {
      return await rawUploadBinary(file)
    },
    [rawUploadBinary],
  )

  return {
    byUploadId,
    uploadingFiles: scopeFiles,
    retry,
  }
}

/** Lấy info của 1 upload theo uploadId (helper type-safe). */
export function getUploadingInfo(
  byUploadId: Map<string, UploadingAttachmentInfo>,
  uploadId: string | undefined,
): UploadingAttachmentInfo | undefined {
  if (!uploadId) return undefined
  return byUploadId.get(uploadId)
}

export type { UploadingFile }
