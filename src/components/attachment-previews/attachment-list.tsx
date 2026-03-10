'use client'

import type { MessageAttachment } from '@/lib/types'
import ImagePreview from './image-preview'
import VideoPreview from './video-preview'
import FilePreview from './file-preview'

interface AttachmentListProps {
  attachments: MessageAttachment[]
  onDownload?: (url: string, name: string) => void
}

/**
 * AttachmentList — Render danh sách attachments trong message
 *
 * Layout:
 * - Single image: full width (max 400px)
 * - Multiple images: grid 2x2 hoặc 3x3
 * - Videos: stacked vertically (max 500px width)
 * - Files: list view với icon
 */
export default function AttachmentList({
  attachments,
  onDownload,
}: AttachmentListProps) {
  if (!attachments.length) return null

  // Group theo type
  const images = attachments.filter((a) => a.type === 'image')
  const videos = attachments.filter((a) => a.type === 'video')
  const files = attachments.filter(
    (a) => a.type === 'file' || a.type === 'audio',
  )

  return (
    <div className="mt-2 space-y-2">
      {/* Images — grid layout */}
      {images.length > 0 && (
        <div
          className={`grid gap-2 ${
            images.length === 1
              ? 'grid-cols-1'
              : images.length === 2
                ? 'grid-cols-2'
                : images.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-3'
          }`}
        >
          {images.map((img) => (
            <ImagePreview
              key={img.id}
              attachment={img}
              allImages={images}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}

      {/* Videos — stacked vertically */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video) => (
            <VideoPreview
              key={video.id}
              attachment={video}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}

      {/* Files — list view */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <FilePreview
              key={file.id}
              attachment={file}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
