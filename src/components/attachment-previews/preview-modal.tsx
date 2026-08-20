'use client'

import { LuDownload, LuX } from 'react-icons/lu'
import { useAppTranslation } from '@/hooks/use-translation'

interface PreviewModalProps {
  open: boolean
  onClose: () => void
  title: string
  onDownload?: () => void
  children: React.ReactNode
}

/**
 * PreviewModal — Modal dùng chung cho PDF và Office preview
 * Header: tên file, nút Tải xuống, nút Đóng
 * Body: nội dung preview (PDF pages hoặc iframe Office)
 */
export default function PreviewModal({
  open,
  onClose,
  title,
  onDownload,
  children,
}: PreviewModalProps) {
  const tAttachments = useAppTranslation("attachments")
  const tCommon = useAppTranslation("common")

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm m-10 rounded-lg"
      >
        <div
          className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#1A1D21] border-b border-[#797c814d] shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white font-medium truncate max-w-[70%]">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="p-2 dark:text-[#d1d2d3] hover:bg-[#2a2d31] rounded transition-colors"
                aria-label={tAttachments("toolbar.download")}
              >
                <LuDownload className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 dark:text-[#d1d2d3] hover:bg-[#2a2d31] rounded transition-colors"
              aria-label={tCommon("close")}
            >
              <LuX className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div
          className="flex-1 min-h-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>

      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
    </>
  )
}
