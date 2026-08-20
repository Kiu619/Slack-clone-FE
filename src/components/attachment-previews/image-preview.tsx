/* eslint-disable @next/next/no-img-element */
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { LuDownload, LuX, LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import type { Message, MessageAttachment } from '@/lib/types'
import {
  getCloudinaryThumbnailUrl,
  getCloudinaryLightboxUrl,
  getCloudinarySrcSet,
} from '@/lib/cloudinary-url'
import { openSafeUrl } from '@/lib/open-safe-url'
import FileToolbar from './file-toolbar'
import { cn } from '@/lib/utils'

import { useTrackAttachmentView } from '@/hooks/use-attachments'
import { useAppTranslation } from '@/hooks/use-translation'

interface ImagePreviewProps {
  attachment: MessageAttachment
  message: Message
  /** Nếu có nhiều images trong cùng message → cho phép navigate */
  allImages?: MessageAttachment[]
  onDownload?: (url: string, name: string) => void
  formDetailPanel?: boolean
  /** Ô lưới vuông (vd. tab Files — 6 cột) */
  compact?: boolean
  isMember?: boolean
  fromPublicChannel?: boolean
}

export default function ImagePreview({
  attachment,
  message,
  allImages = [],
  onDownload,
  formDetailPanel = false,
  compact = false,
  isMember,
  fromPublicChannel,
}: ImagePreviewProps) {
  const { trackView } = useTrackAttachmentView()
  const t = useAppTranslation("attachments")
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const images = allImages.length > 0 ? allImages : [attachment]
  const currentImage = images[currentIndex]
  const thumbSrcSet = getCloudinarySrcSet(attachment.url, [400, 800, 1200])
  const lightboxSrcSet = getCloudinarySrcSet(currentImage.url, [960, 1440, 1920])
  const hasImageDimensions =
    typeof attachment.width === 'number' &&
    typeof attachment.height === 'number' &&
    attachment.width > 0 &&
    attachment.height > 0
  const thumbnailStyle = useMemo<CSSProperties | undefined>(() => {
    if (compact) return undefined

    const maxWidth = 400
    const maxHeight = 300

    if (!hasImageDimensions) {
      return {
        width: maxWidth,
        height: 240,
        maxWidth: '100%',
      }
    }

    const ratio = attachment.width! / attachment.height!
    const width = Math.min(attachment.width!, maxWidth, maxHeight * ratio)
    const height = width / ratio

    return {
      width,
      height,
      maxWidth: '100%',
    }
  }, [attachment.height, attachment.width, compact, hasImageDimensions])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      // Fetch → Blob → download (cross-origin khiến a.download bị ignore, phải dùng blob)
      const urlToFetch = getCloudinaryLightboxUrl(currentImage.url)
      const res = await fetch(urlToFetch)
      if (!res.ok) throw new Error('Fetch failed')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = currentImage.name
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      if (onDownload) {
        onDownload(currentImage.url, currentImage.name)
      } else {
        openSafeUrl(currentImage.url)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleOpenInNewTab = () => {
    openSafeUrl(currentImage.url)
  };

  const openLightbox = () => {
    const idx = images.findIndex((img) => img.id === attachment.id)
    setCurrentIndex(idx >= 0 ? idx : 0)
    trackView({ id: attachment.id, workspaceId: attachment.workspaceId })
    setIsOpen(true)
  }

  // Phím ← / → để chuyển ảnh, Escape để đóng lightbox
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, images.length])

  return (
    <>
      {/* Thumbnail — w-fit, hiển thị tất cả ảnh. Click mở lightbox (trong lightbox có nút trái/phải) */}
      <button
        onClick={openLightbox}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'cursor-pointer group relative rounded-lg overflow-hidden border border-[#797c814d] hover:border-[#797c81] transition-colors',
          compact
            ? 'block h-full w-full min-h-0 min-w-0 border-[#dddddd] dark:border-[#35373B]'
            : 'block w-fit max-w-full',
        )}
        style={thumbnailStyle}
      >
        <img
          src={getCloudinaryThumbnailUrl(attachment.url)}
          {...(thumbSrcSet
            ? {
                srcSet: thumbSrcSet,
                sizes: compact
                  ? '16vw'
                  : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
              }
            : {})}
          alt={attachment.name}
          loading="lazy"
          decoding="async"
          className={cn(
            'block',
            compact
              ? 'h-full w-full min-h-0 min-w-0 max-w-full object-cover'
              : 'h-full w-full object-contain',
          )}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        {!formDetailPanel ? (
          <FileToolbar
            isHovered={isHovered}
            message={message}
            attachment={attachment}
            onDownload={handleDownload}
            onOpen={handleOpenInNewTab}
            isMember={isMember}
            fromPublicChannel={fromPublicChannel}
          />
        ) : null}
      </button>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            {/* Image container — giới hạn kích thước, ảnh fit bên trong */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative flex h-[90vh] max-h-[90vh] w-full max-w-[90vw] items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getCloudinaryLightboxUrl(currentImage.url)}
                {...(lightboxSrcSet ? { srcSet: lightboxSrcSet, sizes: '90vw' } : {})}
                alt={currentImage.name}
                className="max-h-full max-w-full object-contain"
                fetchPriority="high"
              />

              {/* Top bar: filename + close */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-linear-to-b from-black/60 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm font-medium truncate max-w-[70%]">
                    {currentImage.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <LuX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bottom bar: download + navigation */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                  {/* Navigation (nếu có nhiều ảnh) */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                        aria-label={t("status.previousImage")}
                      >
                        <LuChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-white text-sm">
                        {currentIndex + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                        aria-label={t("status.nextImage")}
                      >
                        <LuChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Download button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="ml-auto p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white disabled:opacity-50"
                    aria-label={isDownloading ? t("status.downloading") : t("toolbar.download")}
                  >
                    <LuDownload className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
