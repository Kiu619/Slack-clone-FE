'use client'

import { LuX, LuFile, LuImage, LuVideo } from 'react-icons/lu'
import type { UploadingFile } from '@/hooks/use-file-upload'

interface UploadingFileItemProps {
  file: UploadingFile
  onCancel?: (id: string) => void
}

/**
 * UploadingFileItem — Hiển thị file đang upload với progress bar
 *
 * Features:
 * - Icon tương ứng file type
 * - Progress bar (0-100%)
 * - Cancel button
 * - Error state
 */
export default function UploadingFileItem({
  file,
  onCancel,
}: UploadingFileItemProps) {
  const isImage = file.file.type.startsWith('image/')
  const isVideo = file.file.type.startsWith('video/')

  const icon = isImage ? (
    <LuImage className="w-5 h-5 text-blue-400" />
  ) : isVideo ? (
    <LuVideo className="w-5 h-5 text-purple-400" />
  ) : (
    <LuFile className="w-5 h-5 text-gray-400" />
  )

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-[#222529] border border-[#797c814d]">
      {/* Icon */}
      <div className="flex-shrink-0">{icon}</div>

      {/* File info + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm text-gray-200 truncate">
            {file.file.name}
          </span>
          {file.status === 'uploading' && (
            <span className="text-xs text-gray-400">{file.progress}%</span>
          )}
        </div>

        {/* Progress bar */}
        {file.status === 'uploading' && (
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {file.status === 'error' && (
          <p className="text-xs text-red-400">{file.error}</p>
        )}

        {/* Success */}
        {file.status === 'success' && (
          <p className="text-xs text-green-400">Đã tải lên</p>
        )}
      </div>

      {/* Cancel button */}
      {file.status === 'uploading' && onCancel && (
        <button
          type="button"
          onClick={() => onCancel(file.id)}
          className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <LuX className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  )
}
