"use client"

import type { Message, MessageAttachment } from "@/lib/types"
import { useState } from "react"
import { FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"

/** Microsoft Office Online Viewer — xem Word, Excel, PowerPoint trong iframe */
const OFFICE_VIEWER_URL = "https://view.officeapps.live.com/op/embed.aspx"

interface OfficeFilePreviewProps {
  message: Message;
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean;
}

const OFFICE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; bgClass: string }
> = {
  ppt: {
    icon: <FaFilePowerpoint className="w-12 h-12 text-[#d24726]" />,
    label: "PowerPoint Presentation",
    bgClass: "bg-white",
  },
  pptx: {
    icon: <FaFilePowerpoint className="w-12 h-12 text-[#d24726]" />,
    label: "PowerPoint Presentation",
    bgClass: "bg-white",
  },
  xls: {
    icon: <FaFileExcel className="w-12 h-12 text-[#217346]" />,
    label: "Excel Spreadsheet",
    bgClass: "bg-white",
  },
  xlsx: {
    icon: <FaFileExcel className="w-12 h-12 text-[#217346]" />,
    label: "Excel Spreadsheet",
    bgClass: "bg-white",
  },
  doc: {
    icon: <FaFileWord className="w-12 h-12 text-[#2b579a]" />,
    label: "Word Document",
    bgClass: "bg-white",
  },
  docx: {
    icon: <FaFileWord className="w-12 h-12 text-[#2b579a]" />,
    label: "Word Document",
    bgClass: "bg-white",
  },
}

function getOfficeConfig(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  return OFFICE_CONFIG[ext] ?? null
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * OfficeFilePreview — Card preview + inline viewer giống Slack
 * Click "Xem trước" → modal với Office Online embed
 */
export default function OfficeFilePreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: OfficeFilePreviewProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const config = getOfficeConfig(attachment.name)

  const viewerSrc = `${OFFICE_VIEWER_URL}?src=${encodeURIComponent(attachment.url)}`

  const handleOpenInNewTab = () => {
    window.open(attachment.url, "_blank")
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      window.open(attachment.url, "_blank")
    }
  }

  return (
    <>
      <div
        className="group relative rounded-lg border border-[#797c814d] overflow-hidden bg-[#1a1d21] hover:border-[#797c81] transition-colors w-full max-w-[400px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!formDetailPanel ? (
        <FileToolbar
          isHovered={isHovered}
          message={message}
          attachment={attachment}
          onDownload={handleDownload}
          onOpen={handleOpenInNewTab}
        />
      ) : null}
        {/* Info bar */}
        <div className="px-4 py-3 border-t border-[#797c814d]">
          <p className="text-[15px] font-medium text-[#d1d2d3] truncate mb-0.5">
            {attachment.name}
          </p>
          <p className="text-[13px] text-[#797c81] mb-2">
            {config?.label ?? "Document"} · {formatFileSize(attachment.size)}
          </p>
        </div>

        {/* Preview card — trang đầu Office file (iframe), click mở modal */}
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          className="block w-full shrink-0 relative overflow-hidden bg-[#2a2d31] hover:opacity-95 transition-opacity group h-[260px]"
        >
          <div
            className="absolute inset-0 w-full h-full"
          >
            <iframe
              src={viewerSrc}
              title={`Preview: ${attachment.name}`}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              aria-hidden
            />
            {/* Overlay hover — gợi ý click mở modal */}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end justify-center pb-2">
              <span className="text-[12px] text-white/90">
                Nhấn để xem đầy đủ
              </span>
            </div>
          </div>
        </button>
      </div>

      <PreviewModal
        open={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={attachment.name}
        onDownload={handleDownload}
      >
        <iframe
          src={viewerSrc}
          title={attachment.name}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </PreviewModal>
    </>
  )
}
