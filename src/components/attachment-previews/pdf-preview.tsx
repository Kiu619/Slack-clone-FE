"use client"

import { useFileCache } from "@/hooks/use-file-cache"
import type { Message, MessageAttachment } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuDownload } from "react-icons/lu"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import FileToolbar from "./file-toolbar"
import PreviewModal from "./preview-modal"

// Worker cho PDF.js — dùng unpkg chính thức theo version của pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  message: Message;
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean;
}

/**
 * PdfPreview — Xem PDF inline giống Slack (PDF.js)
 * Hiển thị trang đầu, click để mở modal xem full
 */
export default function PdfPreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: PdfPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: pdfData, isPending, isError } = useFileCache(attachment.url)

  /**
   * PDF.js / worker có thể transfer ArrayBuffer → detach. Dùng chung một ArrayBuffer
   * cho preview thẻ + modal sẽ gây "Cannot perform Construct on a detached ArrayBuffer".
   * Blob + object URL: Blob copy dữ liệu, Document đọc qua URL — an toàn cho nhiều instance.
   */
  const pdfBlobUrl = useMemo(() => {
    if (!pdfData) return null
    const blob = new Blob([pdfData], { type: "application/pdf" })
    return URL.createObjectURL(blob)
  }, [pdfData])

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    }
  }, [pdfBlobUrl])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setError(null)
    },
    [],
  )

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      window.open(attachment.url, "_blank")
    }
  }

  const handleOpenInNewTab = () => {
    window.open(attachment.url, "_blank")
  }

  if (error || isError) {
    // Fallback: card đơn giản khi không load được PDF (CORS, v.v.)
    return (
      <div
        className="rounded-lg border border-[#797c814d] overflow-hidden bg-white dark:bg-[#1A1D21] p-4 w-full max-w-[400px]"
      >
        <p className="text-[#797c81] text-sm mb-2">Can&rsquo;t preview PDF</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.open(attachment.url, "_blank")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] dark:bg-[#222529] dark:text-[#d1d2d3] hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#2a2d31]"
          >
            Open in new tab
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] dark:bg-[#222529] dark:text-[#d1d2d3] hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#2a2d31]"
          >
            <LuDownload size={14} />
            Download
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Preview card — trang đầu PDF */}
      <div
        className="group relative rounded-lg border border-[#797c814d] overflow-hidden bg-white dark:bg-[#1A1D21] hover:border-[#797c81] transition-colors w-full max-w-[400px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="block w-full text-left"

        >
          <div className="px-4 py-3 border-t border-[#797c814d] flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium dark:text-[#d1d2d3] truncate">
                {attachment.name}
              </p>
              <p className="text-[13px] text-[#797c81]">
                PDF {numPages != null ? `· ${numPages} trang` : ""}
              </p>
            </div>
          </div>
          <div
            className="bg-[#2a2d31] flex justify-center overflow-hidden shrink-0 w-full h-[260px]"
          >
            {isPending ? (
              <div
                className="w-full h-full flex items-center justify-center bg-[#25282d] rounded animate-pulse shrink-0"
              >
                <div className="text-[#797c81] text-sm flex items-center gap-2">Loading PDF...<Loader2 className="w-4 h-4 animate-spin" /></div>
              </div>
            ) : pdfBlobUrl ? (
              <Document
                file={pdfBlobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
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
          {pdfBlobUrl ? (
            <Document
              file={pdfBlobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="text-white">Loading document...</div>}
            >
              {numPages != null &&
                Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={i + 1}
                    pageNumber={i + 1}
                    width={Math.min(
                      800,
                      typeof window !== "undefined"
                        ? window.innerWidth - 48
                        : 800,
                    )}
                    renderTextLayer
                    renderAnnotationLayer
                    className="mb-4 shadow-lg"
                  />
                ))}
            </Document>
          ) : (
            <div className="text-white py-20">Loading...</div>
          )}
        </div>
      </PreviewModal>
    </>
  )
}
