"use client"

import type { Message, MessageAttachment } from "@/lib/types"
import { useEffect, useRef, useState } from "react"
import { FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa"
import { Loader2 } from "lucide-react"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"

/** Microsoft Office Online Viewer — xem Word, Excel, PowerPoint trong iframe */
export const OFFICE_VIEWER_URL = "https://view.officeapps.live.com/op/embed.aspx"

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
  const [isInView, setIsInView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const config = getOfficeConfig(attachment.name)
  const viewerSrc = `${OFFICE_VIEWER_URL}?src=${encodeURIComponent(attachment.url)}`

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

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
        className="group relative rounded-lg border border-[#797c814d] overflow-hidden bg-white dark:bg-[#1A1D21] hover:border-[#797c81] transition-colors w-full max-w-[400px]"
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
        <div className="px-4 py-3 border-b border-[#797c814d]">
          <p className="text-[15px] font-medium dark:text-[#d1d2d3] truncate mb-0.5">
            {attachment.name}
          </p>
          <p className="text-[13px] text-[#797c81]">
            {config?.label ?? "Document"} · {formatFileSize(attachment.size)}
          </p>
        </div>

        {/* Preview card container */}
        <div
          ref={containerRef}
          className="relative h-[260px] bg-[#F8F8F8] dark:bg-[#2a2d31]"
        >
          {isInView ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-[#F8F8F8] dark:bg-[#2a2d31]">
                  {config?.icon}
                  <div className="flex items-center gap-2 text-[#797c81] text-xs">
                    Loading preview... <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                </div>
              )}
              <iframe
                src={viewerSrc}
                title={`Preview: ${attachment.name}`}
                className={`absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => setIsLoading(false)}
                aria-hidden
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F8F8F8] dark:bg-[#2a2d31]">
              {config?.icon}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsViewerOpen(true)}
            className="absolute inset-0 w-full h-full cursor-pointer z-20 group/btn hover:bg-transparent!"
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity flex items-end justify-center pb-3">
              <span className="text-[12px] text-white font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                Click to expand
              </span>
            </div>
          </button>
        </div>
      </div>

      <PreviewModal
        open={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={attachment.name}
        onDownload={handleDownload}
      >
        {isViewerOpen && (
          <iframe
            src={viewerSrc}
            title={attachment.name}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </PreviewModal>
    </>
  )
}
