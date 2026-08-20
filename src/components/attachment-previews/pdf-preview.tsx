"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useTrackAttachmentView } from "@/hooks/use-attachments"
import { usePdfSource } from "@/hooks/use-pdf-source"
import { openSafeUrl } from "@/lib/open-safe-url"
import type { Message, MessageAttachment } from "@/lib/types"
import { useCallback, useState } from "react"
import { LuDownload } from "react-icons/lu"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"
import { useAppTranslation } from "@/hooks/use-translation"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfPreviewProps {
  message: Message
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean
}

export default function PdfPreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: PdfPreviewProps) {
  const { trackView } = useTrackAttachmentView()
  const t = useAppTranslation("attachments")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const {
    pdfSourceUrl,
    isPending,
    isError: isSourceError,
  } = usePdfSource(attachment.url)

  const onPreviewLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPreviewError(null)
  }, [])

  const onPreviewLoadError = useCallback((err: Error) => {
    setPreviewError(err.message)
  }, [])

  const onModalLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setModalError(null)
  }, [])

  const onModalLoadError = useCallback((err: Error) => {
    setModalError(err.message)
  }, [])

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      openSafeUrl(attachment.url)
    }
  }

  const handleOpenInNewTab = () => {
    openSafeUrl(attachment.url)
  }

  if (isSourceError) {
    return (
      <div className="rounded-lg border border-[#797c814d] overflow-hidden bg-white dark:bg-[#1A1D21] p-4 w-full max-w-[400px]">
        <p className="text-[#797c81] text-sm mb-2">{t("pdf.cantPreview")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openSafeUrl(attachment.url)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] dark:bg-[#222529] dark:text-[#d1d2d3] hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#2a2d31]"
          >
            {t("toolbar.openInNewTab")}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] dark:bg-[#222529] dark:text-[#d1d2d3] hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#2a2d31]"
          >
            <LuDownload size={14} />
            {t("toolbar.download")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="group relative rounded-lg border border-[#797c814d] overflow-hidden bg-white dark:bg-[#1A1D21] hover:border-[#797c81] transition-colors w-full max-w-[400px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={() => {
            trackView({ id: attachment.id, workspaceId: attachment.workspaceId })
            setIsExpanded(true)
          }}
          className="block w-full text-left"
        >
          <div className="px-4 py-3 border-t border-[#797c814d] flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium dark:text-[#d1d2d3] truncate">
                {attachment.name}
              </p>
              <p className="text-[13px] text-[#797c81]">
                PDF {numPages != null ? `· ${numPages} page${numPages !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
          <div className="bg-[#2a2d31] flex justify-center overflow-hidden shrink-0 w-full h-[260px]">
            {isPending ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#25282d] px-6">
                <Skeleton className="h-24 w-20 rounded-xl bg-[#2f3339]" />
                <Skeleton className="h-4 w-32 bg-[#3a4048]" />
                <Skeleton className="h-3 w-24 bg-[#3a4048]" />
              </div>
            ) : previewError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#25282d] px-6 text-center">
                <p className="text-sm text-[#d1d2d3]">{t("pdf.cantPreview")}</p>
                <p className="text-xs text-[#797c81]">{t("pdf.openFile")}</p>
              </div>
            ) : pdfSourceUrl ? (
              <Document
                file={pdfSourceUrl}
                onLoadSuccess={onPreviewLoadSuccess}
                onLoadError={onPreviewLoadError}
              >
                <Page
                  pageNumber={1}
                  width={400}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
            ) : null}
          </div>
        </button>

        {!formDetailPanel ? (
          <FileToolbar
            isHovered={isHovered}
            message={message}
            attachment={attachment}
            onDownload={handleDownload}
            onOpen={handleOpenInNewTab}
          />
        ) : null}
      </div>

      <PreviewModal
        open={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={attachment.name}
        onDownload={handleDownload}
      >
        <div className="h-full overflow-auto p-4 flex flex-col items-center">
          {isPending ? (
            <div className="flex w-full flex-col items-center gap-3 py-20">
              <Skeleton className="h-72 w-full max-w-[780px] rounded-xl bg-white/10" />
              <Skeleton className="h-4 w-40 bg-white/10" />
            </div>
          ) : modalError ? (
            <div className="flex w-full max-w-[780px] flex-col items-center gap-3 py-20 text-center text-white">
              <p className="text-base font-medium">{t("pdf.cantOpen")}</p>
              <p className="text-sm text-white/70">{t("pdf.tryDownload")}</p>
            </div>
          ) : isExpanded && pdfSourceUrl ? (
            <Document
              file={pdfSourceUrl}
              onLoadSuccess={onModalLoadSuccess}
              onLoadError={onModalLoadError}
              loading={
                <div className="flex w-full flex-col items-center gap-3 py-10">
                  <Skeleton className="h-64 w-full max-w-[780px] rounded-xl bg-white/10" />
                  <Skeleton className="h-4 w-40 bg-white/10" />
                </div>
              }
            >
              {numPages != null &&
                Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={i + 1}
                    pageNumber={i + 1}
                    width={Math.min(
                      800,
                      typeof window !== "undefined" ? window.innerWidth - 48 : 800,
                    )}
                    renderTextLayer
                    renderAnnotationLayer
                    className="mb-4 shadow-lg"
                  />
                ))}
            </Document>
          ) : (
            <div className="flex w-full flex-col items-center gap-3 py-20">
              <Skeleton className="h-72 w-full max-w-[780px] rounded-xl bg-white/10" />
              <Skeleton className="h-4 w-40 bg-white/10" />
            </div>
          )}
        </div>
      </PreviewModal>
    </>
  )
}
