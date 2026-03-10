'use client'

import { useRef, useState } from 'react'
import { LuDownload, LuPlay, LuPause } from 'react-icons/lu'
import type { MessageAttachment } from '@/lib/types'

interface VideoPreviewProps {
  attachment: MessageAttachment
  onDownload?: (url: string, name: string) => void
}

/**
 * VideoPreview — Preview video với controls (play/pause, timeline, volume...)
 *
 * Features:
 * - HTML5 video player với custom controls
 * - Play inline trong chat (không cần mở modal)
 * - Download button
 * - Responsive (max-width 100%)
 */
export default function VideoPreview({
  attachment,
  onDownload,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      void videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name)
    } else {
      window.open(attachment.url, '_blank')
    }
  }

  return (
    <div className="relative max-w-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        src={attachment.url}
        className="w-full h-auto"
        controls
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </video>

      {/* Custom play button overlay (khi video chưa play) */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <LuPlay className="w-8 h-8 text-gray-900 ml-1" />
          </div>
        </button>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between text-white text-sm">
          <span className="truncate max-w-[70%]">{attachment.name}</span>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Download"
          >
            <LuDownload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
