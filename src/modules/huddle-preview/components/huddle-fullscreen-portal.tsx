"use client"

import { useHuddleFullscreenStore } from "@/stores/useHuddleFullscreenStore"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Track } from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserInitials } from "@/modules/huddle-preview/huddle-preview.utils"
import { LuMaximize2, LuMinimize2 } from "react-icons/lu"

export default function HuddleFullscreenPortal() {
  const [mounted, setMounted] = useState(false)
  const payload = useHuddleFullscreenStore((s) => s.payload)
  const close = useHuddleFullscreenStore((s) => s.close)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeRequestedRef = useRef(false)

  useEffect(() => setMounted(true), [])

  // Attach track to video
  useEffect(() => {
    if (!payload || !videoRef.current) return
    const publication = payload.participant.getTrackPublication(Track.Source.ScreenShare)
    const track = publication?.videoTrack
    if (!track) return
    track.attach(videoRef.current)
    return () => {
      if (videoRef.current) track.detach(videoRef.current)
    }
  }, [payload?.participant])

  // Track fullscreen changes - close portal when fullscreen exits
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement
      setIsFullscreen(inFullscreen)

      // If fullscreen was exited and close was requested, close the portal
      if (!inFullscreen && closeRequestedRef.current) {
        closeRequestedRef.current = false
        close()
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [close])

  // Request fullscreen on mount
  useEffect(() => {
    if (!payload || !containerRef.current) return
    closeRequestedRef.current = false
    containerRef.current.requestFullscreen?.()
  }, [payload])

  // Auto-hide toolbar
  useEffect(() => {
    if (!isFullscreen) return
    const showToolbar = () => {
      setIsToolbarVisible(true)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = setTimeout(() => setIsToolbarVisible(false), 3000)
    }
    document.addEventListener("mousemove", showToolbar)
    showToolbar()
    return () => {
      document.removeEventListener("mousemove", showToolbar)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [isFullscreen])

  const handleExitFullscreen = useCallback(() => {
    closeRequestedRef.current = true
    void document.exitFullscreen()
  }, [])

  const handleCloseWithDeselect = useCallback(() => {
    closeRequestedRef.current = true
    void document.exitFullscreen()
    payload?.onClose?.()
  }, [payload?.onClose])

  const handleRequestFullscreen = useCallback(() => {
    closeRequestedRef.current = false
    containerRef.current?.requestFullscreen?.()
  }, [])

  // Keyboard: F to toggle, Escape to close (with deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (isFullscreen) {
          handleExitFullscreen()
        } else {
          handleRequestFullscreen()
        }
      }
      if (e.key === "Escape") {
        handleCloseWithDeselect()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, handleExitFullscreen, handleRequestFullscreen, handleCloseWithDeselect])

  const handleFullscreenToggle = () => {
    if (isFullscreen) {
      handleExitFullscreen()
    } else {
      handleRequestFullscreen()
    }
  }

  if (!mounted || !payload) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />

      {/* Toolbar */}
      <div
        className={`absolute left-0 right-0 top-0 flex h-[60px] items-center gap-3 bg-black/40 px-5 transition-opacity duration-300 ${
          isToolbarVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={payload.avatarSrc ?? undefined} alt={payload.avatarLabel} />
          <AvatarFallback className="rounded-full bg-black/20 text-[10px] font-semibold text-white">
            {getUserInitials(payload.avatarLabel)}
          </AvatarFallback>
        </Avatar>
        <span className="text-[14px] font-medium text-white">{payload.displayName}</span>
        <span className="text-[14px] text-white/60">Screen share</span>
        <div className="flex-1" />
        <button
          onClick={handleFullscreenToggle}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          {isFullscreen ? <LuMinimize2 size={16} /> : <LuMaximize2 size={16} />}
        </button>
        <button
          onClick={handleCloseWithDeselect}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}
