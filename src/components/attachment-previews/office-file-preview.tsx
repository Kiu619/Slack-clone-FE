"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useTrackAttachmentView } from "@/hooks/use-attachments"
import { useOfficePreviewSession } from "@/hooks/use-office-preview-session"
import { openSafeUrl } from "@/lib/open-safe-url"
import type { Message, MessageAttachment } from "@/lib/types"
import { useState } from "react"
import { FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa"
import { LuExternalLink } from "react-icons/lu"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"

interface OfficeFilePreviewProps {
  message: Message
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean
}

const OFFICE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; accentClass: string; panelClass: string }
> = {
  ppt: {
    icon: <FaFilePowerpoint className="h-14 w-14 text-[#d24726]" />,
    label: "PowerPoint Presentation",
    accentClass: "text-[#d24726]",
    panelClass: "from-[#fff4ef] to-[#ffe2d6] dark:from-[#3d241d] dark:to-[#261511]",
  },
  pptx: {
    icon: <FaFilePowerpoint className="h-14 w-14 text-[#d24726]" />,
    label: "PowerPoint Presentation",
    accentClass: "text-[#d24726]",
    panelClass: "from-[#fff4ef] to-[#ffe2d6] dark:from-[#3d241d] dark:to-[#261511]",
  },
  xls: {
    icon: <FaFileExcel className="h-14 w-14 text-[#217346]" />,
    label: "Excel Spreadsheet",
    accentClass: "text-[#217346]",
    panelClass: "from-[#effaf3] to-[#d8f1e1] dark:from-[#183325] dark:to-[#0f2419]",
  },
  xlsx: {
    icon: <FaFileExcel className="h-14 w-14 text-[#217346]" />,
    label: "Excel Spreadsheet",
    accentClass: "text-[#217346]",
    panelClass: "from-[#effaf3] to-[#d8f1e1] dark:from-[#183325] dark:to-[#0f2419]",
  },
  doc: {
    icon: <FaFileWord className="h-14 w-14 text-[#2b579a]" />,
    label: "Word Document",
    accentClass: "text-[#2b579a]",
    panelClass: "from-[#eef5ff] to-[#dbe9ff] dark:from-[#1b2740] dark:to-[#121b2d]",
  },
  docx: {
    icon: <FaFileWord className="h-14 w-14 text-[#2b579a]" />,
    label: "Word Document",
    accentClass: "text-[#2b579a]",
    panelClass: "from-[#eef5ff] to-[#dbe9ff] dark:from-[#1b2740] dark:to-[#121b2d]",
  },
}

function getOfficeConfig(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  return (
    OFFICE_CONFIG[ext] ?? {
      icon: <FaFileWord className="h-14 w-14 text-[#5e5d60]" />,
      label: "Document",
      accentClass: "text-[#5e5d60]",
      panelClass: "from-[#f3f3f4] to-[#e4e4e7] dark:from-[#2a2d31] dark:to-[#202327]",
    }
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function OfficeFilePreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: OfficeFilePreviewProps) {
  const { trackView } = useTrackAttachmentView()
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [viewerError, setViewerError] = useState<string | null>(null)

  const config = getOfficeConfig(attachment.name)
  const { viewerSrc, isWarm, warmSession, markOpened } = useOfficePreviewSession(attachment.url)
  const hasThumbnail = !!attachment.previewImageUrl
  const isGeneratingPreview = attachment.previewStatus === "pending" && !hasThumbnail
  const isFallbackShell = !hasThumbnail

  const handleOpenInNewTab = () => {
    openSafeUrl(attachment.url)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      openSafeUrl(attachment.url)
    }
  }

  const handleOpenViewer = () => {
    trackView({ id: attachment.id, workspaceId: attachment.workspaceId })
    markOpened()
    setViewerError(null)
    setIsViewerLoading(true)
    setIsViewerOpen(true)
  }

  return (
    <>
      <div
        className="group relative max-w-[400px] overflow-hidden rounded-lg border border-[#797c814d] bg-white transition-colors hover:border-[#797c81] dark:bg-[#1A1D21] w-full"
        onMouseEnter={() => {
          setIsHovered(true)
          warmSession()
        }}
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

        <div className="border-b border-[#797c814d] px-4 py-3">
          <p className="mb-0.5 truncate text-[15px] font-medium dark:text-[#d1d2d3]">
            {attachment.name}
          </p>
          <p className="text-[13px] text-[#797c81]">
            {config.label} · {formatFileSize(attachment.size)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenViewer}
          className={`relative h-[260px] w-full overflow-hidden bg-gradient-to-br ${config.panelClass} text-left`}
        >
          {hasThumbnail ? (
            <>
              <img
                src={attachment.previewImageUrl ?? undefined}
                alt={`${attachment.name} preview`}
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex justify-end p-4">
                <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#1d1c1d]">
                  {isWarm ? "Ready to preview" : "Open preview"}
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                    {config.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">
                    {attachment.name}
                  </p>
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-[#1d1c1d] shadow-sm">
                  <LuExternalLink size={14} />
                  Open preview
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)]" />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                    {config.icon}
                  </div>
                  <div className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5e5d60] dark:bg-white/10 dark:text-white/70">
                    {isGeneratingPreview
                      ? "Generating preview"
                      : isWarm
                        ? "Ready to preview"
                        : "Open preview"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5e5d60] dark:text-white/55">
                      {isGeneratingPreview ? "Thumbnail pipeline" : "Microsoft 365 Viewer"}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#1d1c1d] dark:text-[#f8f8f8]">
                      {isGeneratingPreview ? "Generating first-page thumbnail" : config.label}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#5e5d60] dark:text-white/70">
                      <span className={`font-medium ${config.accentClass}`}>
                        {isFallbackShell ? "Office fallback" : "Office"}
                      </span>
                      <span>·</span>
                      <span>{formatFileSize(attachment.size)}</span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-[#1d1c1d] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm dark:bg-white dark:text-[#1d1c1d]">
                      <LuExternalLink size={14} />
                      Click to expand
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </button>
      </div>

      <PreviewModal
        open={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setIsViewerLoading(false)
        }}
        title={attachment.name}
        onDownload={handleDownload}
      >
        <div className="relative h-full w-full bg-white">
          {isViewerLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <Skeleton className="h-4 w-40" />
              <p className="text-sm text-[#616061]">Loading Office preview...</p>
            </div>
          )}

          {viewerError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-lg font-semibold text-[#1d1c1d]">Can&apos;t open Office preview</p>
              <p className="max-w-[420px] text-sm text-[#616061]">
                Microsoft Office Online couldn&apos;t load this file preview. You can still open the file in a new tab or download it.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="rounded-md bg-[#1d1c1d] px-4 py-2 text-sm font-medium text-white"
                >
                  Open in new tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md border border-[#d1d2d3] px-4 py-2 text-sm font-medium text-[#1d1c1d]"
                >
                  Download file
                </button>
              </div>
            </div>
          ) : isViewerOpen && viewerSrc ? (
            <iframe
              src={viewerSrc}
              title={attachment.name}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onLoad={() => setIsViewerLoading(false)}
              onError={() => {
                setIsViewerLoading(false)
                setViewerError("load_failed")
              }}
            />
          ) : null}
        </div>
      </PreviewModal>
    </>
  )
}
