"use client";

import { useVideoFullscreenStore } from "@/stores/useVideoFullscreenStore";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import VideoPreview from "./video-preview";

export default function VideoFullscreenPortal() {
  const [mounted, setMounted] = useState(false);
  const payload = useVideoFullscreenStore((s) => s.payload);
  const closeFromPortal = useVideoFullscreenStore((s) => s.closeFromPortal);

  useEffect(() => setMounted(true), []);

  if (!mounted || !payload) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black"
      aria-modal
      role="dialog"
    >
      <VideoPreview
        key={payload.sessionKey}
        message={payload.message}
        attachment={payload.attachment}
        onDownload={payload.onDownload}
        autoEnterFullscreen
        initialPlayback={{
          currentTime: payload.startTime,
          wasPlaying: payload.wasPlaying,
          volume: payload.volume,
          muted: payload.muted,
          playbackRate: payload.playbackRate,
        }}
        onDetachedClose={(resume) => closeFromPortal(resume)}
      />
    </div>,
    document.body,
  );
}
