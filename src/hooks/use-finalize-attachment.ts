'use client'

import { useCallback } from 'react'
import { apiClient } from '@/lib/axios'

export interface FinalizeAttachmentInput {
  messageId: string
  pendingUploadId: string
  url: string
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  fileCategory?: string
}

export interface FinalizeAttachmentResponse {
  id: string
  messageId: string
  workspaceId: string
  url: string
  type: string
  name: string
  size: number
  mimeType: string | null
  width: number | null
  height: number | null
  duration: number | null
  fileCategory: string
  pendingUploadId: string | null
  previewImageUrl: string | null
  previewStatus: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Hook gọi API finalize attachment (sau khi client upload xong file thật lên S3/Cloudinary).
 *
 * Endpoint: `POST /messages/:messageId/attachments/:pendingUploadId/finalize`
 *
 * Match attachment theo `pendingUploadId` (client-generated uploadId), update URL thật
 * + clear `pendingUploadId` trên server.
 *
 * Trả về `finalize` callback — caller tự quyết định khi nào gọi (sau khi upload xong).
 */
export function useFinalizeAttachment() {
  const finalize = useCallback(
    async (input: FinalizeAttachmentInput): Promise<FinalizeAttachmentResponse> => {
      const { messageId, pendingUploadId, ...body } = input
      const res = await apiClient.post<FinalizeAttachmentResponse>(
        `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(pendingUploadId)}/finalize`,
        body,
      )
      return res.data
    },
    [],
  )

  return { finalize }
}
