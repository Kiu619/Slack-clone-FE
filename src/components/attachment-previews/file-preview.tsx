'use client'

import React from 'react'
import { LuDownload, LuFile, LuFileText, LuFileArchive } from 'react-icons/lu'
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint } from 'react-icons/fa'
import type { MessageAttachment } from '@/lib/types'

interface FilePreviewProps {
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
}

/**
 * FilePreview — Preview cho generic files (PDF, DOC, ZIP...)
 *
 * Features:
 * - Icon tương ứng với file type
 * - File name + size (format: "2.5 MB")
 * - Download button
 * - Hover effect
 */
export default function FilePreview({
  attachment,
  onDownload,
}: FilePreviewProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      window.open(attachment.url, '_blank')
    }
  }

  const fileIcon = getFileIcon(attachment.name)
  const fileSize = formatFileSize(attachment.size)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors max-w-[400px] bg-gray-50 dark:bg-gray-800/50">
      {/* File icon */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded bg-white dark:bg-gray-700">
        {fileIcon}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{fileSize}</p>
      </div>

      {/* Download button */}
      <button
        type="button"
        onClick={handleDownload}
        className="shrink-0 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Download"
      >
        <LuDownload className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  )
}

/**
 * Get icon component dựa trên file extension
 */
function getFileIcon(fileName: string): React.ReactElement {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''

  const iconClass = 'w-6 h-6'

  switch (ext) {
    case '.pdf':
      return <FaFilePdf className={`${iconClass} text-red-500`} />
    case '.doc':
    case '.docx':
      return <FaFileWord className={`${iconClass} text-blue-500`} />
    case '.xls':
    case '.xlsx':
      return <FaFileExcel className={`${iconClass} text-green-500`} />
    case '.ppt':
    case '.pptx':
      return <FaFilePowerpoint className={`${iconClass} text-orange-500`} />
    case '.zip':
    case '.rar':
    case '.7z':
    case '.tar':
    case '.gz':
      return <LuFileArchive className={`${iconClass} text-yellow-600`} />
    case '.txt':
    case '.md':
    case '.json':
    case '.xml':
    case '.csv':
      return <LuFileText className={`${iconClass} text-gray-500`} />
    default:
      return <LuFile className={`${iconClass} text-gray-400`} />
  }
}

/**
 * Format file size: bytes → "2.5 MB"
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
