'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUploadingAttachmentsContext } from '@/providers/UploadingAttachmentsProvider'
import { updateAttachmentInMessageCache } from '@/lib/update-attachment-in-cache'
import { useFinalizeAttachment } from '@/hooks/use-finalize-attachment'
import { removePendingUploadEntry } from '@/lib/pending-upload-storage'
import type { MessageAttachment } from '@/lib/types'

/**
 * useRetryAttachment — hook để retry upload 1 file đã fail.
 *
 * Flow:
 * 1. Gọi `retry()` từ UploadingAttachmentsProvider để upload lại file.
 * 2. Gọi API finalize (POST /messages/:id/attachments/:pendingUploadId/finalize)
 *    để PATCH URL thật lên server.
 * 3. Patch optimistic message trong message cache.
 * 4. Cleanup localStorage entry.
 *
 * Phải dùng bên trong UploadingAttachmentsProvider.
 */
export function useRetryAttachment(workspaceId?: string) {
  const { retry, byUploadId } = useUploadingAttachmentsContext()
  const queryClient = useQueryClient()
  const { finalize } = useFinalizeAttachment()

  const retryAttachment = useCallback(
    async (attachment: MessageAttachment) => {
      const pendingUploadId = attachment.pendingUploadId ?? attachment.uploadId
      if (!pendingUploadId) return

      const oldUploadId = attachment.uploadId ?? pendingUploadId
      const file = byUploadId.get(oldUploadId)?.file
      if (!file) return

      const messageId = attachment.messageId
      if (!messageId) {
        try {
          const result = await retry(file)
          const newUrl = (result as { url: string }).url
          updateAttachmentInMessageCache(
            queryClient,
            { pendingUploadId },
            (a) => {
              if (a.pendingUploadId !== pendingUploadId) return a
              const next: MessageAttachment = {
                ...a,
                url: newUrl,
                uploadStatus: null,
                uploadId: undefined,
                pendingUploadId: null,
                // Preview fields sẽ được set khi message được finalize
                previewImageUrl: null,
                previewStatus: null,
              }
              return next
            },
            workspaceId,
          )
        } catch {
          /* keep uploadStatus='failed' */
        }
        return
      }

      try {
        const result = await retry(file)
        const newUrl = (result as { url: string }).url

        const finalizeResult = await finalize({
          messageId,
          pendingUploadId,
          url: newUrl,
          mimeType: file.type,
          width: (result as { width?: number }).width,
          height: (result as { height?: number }).height,
          duration: (result as { duration?: number }).duration,
          fileCategory: (result as { fileCategory?: string }).fileCategory,
        })

        removePendingUploadEntry(messageId, pendingUploadId)

        updateAttachmentInMessageCache(
          queryClient,
          { pendingUploadId },
          (a) => {
            if (a.pendingUploadId !== pendingUploadId) return a
            const next: MessageAttachment = {
              ...a,
              url: finalizeResult.url,
              uploadStatus: null,
              uploadId: undefined,
              pendingUploadId: null,
              // Thêm preview fields để Office thumbnail hiển thị ngay
              previewImageUrl: finalizeResult.previewImageUrl ?? null,
              previewStatus:
                finalizeResult.previewStatus === "pending" ||
                finalizeResult.previewStatus === "ready" ||
                finalizeResult.previewStatus === "failed"
                  ? finalizeResult.previewStatus
                  : null,
            }
            return next
          },
          workspaceId,
        )
      } catch {
        // Retry fail → giữ nguyên uploadStatus='failed' + persist localStorage.
      }
    },
    [retry, byUploadId, queryClient, workspaceId, finalize],
  )

  return { retryAttachment }
}
