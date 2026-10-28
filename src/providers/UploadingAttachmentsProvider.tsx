'use client'

import * as React from 'react'
import {
  useUploadingAttachments,
  type UploadingAttachmentInfo,
  type UploadingFile,
} from '@/hooks/use-uploading-attachments'

interface UploadingAttachmentsContextValue {
  byUploadId: ReadonlyMap<string, UploadingAttachmentInfo>
  uploadingFiles: ReadonlyArray<UploadingFile>
  retry: (file: File) => Promise<Record<string, unknown>>
  hasActiveUploads: boolean
}

const UploadingAttachmentsContext =
  React.createContext<UploadingAttachmentsContextValue | null>(null)

export function UploadingAttachmentsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { byUploadId, uploadingFiles, retry } = useUploadingAttachments()

  const value = React.useMemo<UploadingAttachmentsContextValue>(
    () => ({
      byUploadId,
      uploadingFiles,
      retry,
      hasActiveUploads: uploadingFiles.length > 0,
    }),
    [byUploadId, uploadingFiles, retry],
  )

  return (
    <UploadingAttachmentsContext.Provider value={value}>
      {children}
    </UploadingAttachmentsContext.Provider>
  )
}

/**
 * Lấy context từ UploadingAttachmentsProvider.
 * Throw nếu không có provider — đảm bảo luôn wrap trong UploadingAttachmentsProvider.
 */
export function useUploadingAttachmentsContext(): UploadingAttachmentsContextValue {
  const ctx = React.useContext(UploadingAttachmentsContext)
  if (!ctx) {
    throw new Error(
      'useUploadingAttachmentsContext must be used inside <UploadingAttachmentsProvider>',
    )
  }
  return ctx
}
