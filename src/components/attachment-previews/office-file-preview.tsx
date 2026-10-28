"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useTrackAttachmentView } from "@/hooks/use-attachments"
import { useOfficePreviewSession } from "@/hooks/use-office-preview-session"
import { openSafeUrl } from "@/lib/open-safe-url"
import type { Message, MessageAttachment } from "@/lib/types"
import { useState } from "react"
import { createPortal } from "react-dom"
import { FaFileExcel, FaFilePowerpoint, FaFileWord } from "react-icons/fa"
import { LuExternalLink } from "react-icons/lu"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"
import { UploadStatusOverlay } from "./upload-status-overlay"
import { UploadingPlaceholder } from "./uploading-placeholder"
import { useAppTranslation } from "@/hooks/use-translation"

interface OfficeFilePreviewProps {
  message: Message
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean
  /** Callback retry — truyền từ attachment-list (lấy từ UploadingAttachmentsContext) */
  onRetry?: () => void
  /** Set of attachment IDs saved for Later — passed to FileToolbar */
  savedAttachmentIds?: Set<string>
}

const OFFICE_CONFIG: Record<
  string,
  { icon: React.ReactNode; labelKey: string; accentClass: string; panelClass: string }
> = {
  ppt: {
    icon: <FaFilePowerpoint className="h-14 w-14 text-[#d24726]" />,
    labelKey: "office.powerPoint",
    accentClass: "text-[#d24726]",
    panelClass: "from-[#fff4ef] to-[#ffe2d6] dark:from-[#3d241d] dark:to-[#261511]",
  },
  pptx: {
    icon: <FaFilePowerpoint className="h-14 w-14 text-[#d24726]" />,
    labelKey: "office.powerPoint",
    accentClass: "text-[#d24726]",
    panelClass: "from-[#fff4ef] to-[#ffe2d6] dark:from-[#3d241d] dark:to-[#261511]",
  },
  xls: {
    icon: <FaFileExcel className="h-14 w-14 text-[#217346]" />,
    labelKey: "office.excel",
    accentClass: "text-[#217346]",
    panelClass: "from-[#effaf3] to-[#d8f1e1] dark:from-[#183325] dark:to-[#0f2419]",
  },
  xlsx: {
    icon: <FaFileExcel className="h-14 w-14 text-[#217346]" />,
    labelKey: "office.excel",
    accentClass: "text-[#217346]",
    panelClass: "from-[#effaf3] to-[#d8f1e1] dark:from-[#183325] dark:to-[#0f2419]",
  },
  doc: {
    icon: <FaFileWord className="h-14 w-14 text-[#2b579a]" />,
    labelKey: "office.word",
    accentClass: "text-[#2b579a]",
    panelClass: "from-[#eef5ff] to-[#dbe9ff] dark:from-[#1b2740] dark:to-[#121b2d]",
  },
  docx: {
    icon: <FaFileWord className="h-14 w-14 text-[#2b579a]" />,
    labelKey: "office.word",
    accentClass: "text-[#2b579a]",
    panelClass: "from-[#eef5ff] to-[#dbe9ff] dark:from-[#1b2740] dark:to-[#121b2d]",
  },
}

function getOfficeConfig(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  return (
    OFFICE_CONFIG[ext] ?? {
      icon: <FaFileWord className="h-14 w-14 text-[#5e5d60]" />,
      labelKey: "office.document",
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
  onRetry,
  savedAttachmentIds,
}: OfficeFilePreviewProps) {
  const { trackView } = useTrackAttachmentView()
  const t = useAppTranslation("attachments")
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [viewerError, setViewerError] = useState<string | null>(null)
  // Guard SSR cho createPortal — document chỉ có sau khi component mount trên client.
  // Khởi tạo trực tiếp từ typeof window để tránh setState trong effect (gây cascading render).
  const [mounted] = useState(() => typeof window !== "undefined")

  const config = getOfficeConfig(attachment.name)
  const { viewerSrc, isWarm, warmSession, markOpened } = useOfficePreviewSession(attachment.url ?? null)
  const hasThumbnail = !!attachment.previewImageUrl
  const isGeneratingPreview = attachment.previewStatus === "pending" && !hasThumbnail
  const isFallbackShell = !hasThumbnail

  const handleOpenInNewTab = () => {
    if (!attachment.url) return
    openSafeUrl(attachment.url)
  }

  const handleDownload = () => {
    if (!attachment.url) return
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

  // Attachment đang pending upload (chưa có URL thật) → render placeholder
  // tránh crash khi Office viewer cần URL.
  const isPendingUpload =
    !attachment.url &&
    (attachment.uploadStatus === "uploading" ||
      attachment.uploadStatus === "pending" ||
      !!attachment.uploadId ||
      !!attachment.pendingUploadId)

  if (isPendingUpload) {
    return (
      <UploadingPlaceholder variant="office" fileName={attachment.name} />
    )
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
            savedAttachmentIds={savedAttachmentIds}
          />
        ) : null}

        <div className="border-b border-[#797c814d] px-4 py-3">
          <p className="mb-0.5 truncate text-[15px] font-medium dark:text-[#d1d2d3]">
            {attachment.name}
          </p>
          <p className="text-[13px] text-[#797c81]">
            {t(config.labelKey)} · {formatFileSize(attachment.size)}
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
                className="h-full w-full object-cover object-top  hover:cursor-zoom-in"
              />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)]" />
              <div className="relative flex h-full flex-col justify-between p-5 hover:cursor-zoom-in">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                    {config.icon}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5e5d60] dark:text-white/55">
                      {isGeneratingPreview ? t("office.thumbnailPipeline") : t("office.microsoft365")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#1d1c1d] dark:text-[#f8f8f8]">
                      {isGeneratingPreview ? t("office.generatingFirstPage") : t(config.labelKey)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </button>

        <UploadStatusOverlay status={attachment.uploadStatus} onRetry={onRetry} />
      </div>

      {isViewerOpen && mounted
        ? createPortal(
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
                    <p className="text-sm text-[#616061]">{t("office.loading")}</p>
                  </div>
                )}

                {viewerError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                    <p className="text-lg font-semibold text-[#1d1c1d]">{t("office.cantOpen")}</p>
                    <p className="max-w-[420px] text-sm text-[#616061]">
                      {t("office.cantOpenDescription")}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleOpenInNewTab}
                        className="rounded-md bg-[#1d1c1d] px-4 py-2 text-sm font-medium text-white"
                      >
                        {t("office.openFileInNewTab")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="rounded-md border border-[#d1d2d3] px-4 py-2 text-sm font-medium text-[#1d1c1d]"
                      >
                        {t("office.downloadFile")}
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
            </PreviewModal>,
            document.body,
          )
        : null}
    </>
  )
}
