'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { LuDownload, LuX, LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import type { MessageAttachment } from '@/lib/types'
import Image from 'next/image'

interface ImagePreviewProps {
  attachment: MessageAttachment
  /** Nếu có nhiều images trong cùng message → cho phép navigate */
  allImages?: MessageAttachment[]
  onDownload?: (url: string, name: string) => void
}

/**
 * ImagePreview — Preview ảnh với lightbox (zoom, navigate, download)
 *
 * Features:
 * - Click vào ảnh → mở lightbox fullscreen
 * - Navigate giữa nhiều ảnh (prev/next)
 * - Download button
 * - Close bằng ESC hoặc click backdrop
 * - Lazy load với loading="lazy"
 */
export default function ImagePreview({
  attachment,
  allImages = [],
  onDownload,
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const images = allImages.length > 0 ? allImages : [attachment]
  const currentImage = images[currentIndex]

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentImage.url, currentImage.name)
    } else {
      // Fallback: mở URL trong tab mới
      window.open(currentImage.url, '_blank')
    }
  }

  return (
    <>
      {/* Thumbnail — click để mở lightbox */}
      <button
        type="button"
        onClick={() => {
          const idx = images.findIndex((img) => img.id === attachment.id)
          setCurrentIndex(idx >= 0 ? idx : 0)
          setIsOpen(true)
        }}
        className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          loading="lazy"
          className="max-w-full h-auto max-h-[300px] object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {/* Overlay khi hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </button>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            {/* Image container */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentImage.url}
                alt={currentImage.name}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />

              {/* Top bar: filename + close */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
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
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                  {/* Navigation (nếu có nhiều ảnh) */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
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
                      >
                        <LuChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Download button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="ml-auto p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                  >
                    <LuDownload className="w-5 h-5" />
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
