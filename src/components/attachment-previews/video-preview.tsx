"use client";

import type { Message, MessageAttachment } from "@/lib/types";
import { useVideoFullscreenStore } from "@/stores/useVideoFullscreenStore";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { openSafeUrl } from "@/lib/open-safe-url";
import FileToolbar from "./file-toolbar";
import {
  LuPlay,
  LuPause,
  LuVolume2,
  LuVolumeX,
  LuMaximize,
  LuMinimize,
} from "react-icons/lu";
import { MdPictureInPictureAlt } from "react-icons/md";

import { useTrackAttachmentView } from "@/hooks/use-attachments";

// Helper
function fmtTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoPreviewProps {
  message: Message;
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
  formDetailPanel?: boolean;
  /** Ô lưới nhỏ (tab Files) — ẩn thanh điều khiển dưới, video full khung */
  compact?: boolean;
  /**
   * Trong danh sách tin (Virtuoso): mở fullscreen qua portal gắn document.body,
   * tránh unmount / transform tổ tiên làm văng Fullscreen API.
   */
  useExternalFullscreen?: boolean;
  /** Instance render trong portal — tự gọi requestFullscreen sau mount */
  autoEnterFullscreen?: boolean;
  initialPlayback?: {
    currentTime: number;
    wasPlaying: boolean;
    volume: number;
    muted: boolean;
    playbackRate: number;
  };
  onDetachedClose?: (resume: { time: number; play: boolean }) => void;
  isMember?: boolean;
  fromPublicChannel?: boolean;
}

export default function VideoPreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
  compact = false,
  useExternalFullscreen = false,
  autoEnterFullscreen = false,
  initialPlayback,
  onDetachedClose,
  isMember,
  fromPublicChannel,
}: VideoPreviewProps) {
  const { trackView } = useTrackAttachmentView();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const portalFsAttemptedRef = useRef(false);
  const portalHadFsRef = useRef(false);
  const initialPlaybackAppliedRef = useRef(false);

  const openPortal = useVideoFullscreenStore((s) => s.open);
  const storePayload = useVideoFullscreenStore((s) => s.payload);
  const consumeLastInlineResume = useVideoFullscreenStore(
    (s) => s.consumeLastInlineResume,
  );

  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(
    () => initialPlayback?.wasPlaying ?? false,
  );
  const [currentTime, setCurrentTime] = useState(
    () => initialPlayback?.currentTime ?? 0,
  );
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => initialPlayback?.volume ?? 1);
  const [isMuted, setIsMuted] = useState(() => initialPlayback?.muted ?? false);
  const [playbackRate, setPlaybackRate] = useState(
    () => initialPlayback?.playbackRate ?? 1,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isOpenElsewhere =
    useExternalFullscreen &&
    storePayload != null &&
    storePayload.message.id === message.id &&
    storePayload.attachment.id === attachment.id;

  useEffect(() => {
    if (storePayload != null || !useExternalFullscreen) return;
    const r = useVideoFullscreenStore.getState().lastInlineResume;
    if (
      !r ||
      r.messageId !== message.id ||
      r.attachmentId !== attachment.id
    ) {
      return;
    }
    const v = videoRef.current;
    if (v) {
      v.currentTime = r.time;
      if (r.play) void v.play();
    }
    consumeLastInlineResume();
  }, [
    storePayload,
    useExternalFullscreen,
    message.id,
    attachment.id,
    consumeLastInlineResume,
  ]);

  useEffect(() => {
    if (!initialPlayback) return;
    const v = videoRef.current;
    if (!v || initialPlaybackAppliedRef.current) return;
    const apply = () => {
      if (initialPlaybackAppliedRef.current || !videoRef.current) return;
      initialPlaybackAppliedRef.current = true;
      const el = videoRef.current;
      el.currentTime = initialPlayback.currentTime;
      el.volume = initialPlayback.volume;
      el.muted = initialPlayback.muted;
      el.playbackRate = initialPlayback.playbackRate;
      setVolume(initialPlayback.volume);
      setIsMuted(initialPlayback.muted);
      setPlaybackRate(initialPlayback.playbackRate);
      setCurrentTime(initialPlayback.currentTime);
      if (initialPlayback.wasPlaying) void el.play();
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => v.removeEventListener("loadedmetadata", apply);
  }, [initialPlayback]);

  useEffect(() => {
    if (isOpenElsewhere) return;
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [isOpenElsewhere, attachment.url]);

  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      const fsEl =
        document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      const active = !!fsEl;
      const ours = fsEl === containerRef.current;
      setIsFullscreen(active && ours);

      if (!autoEnterFullscreen || !onDetachedClose) return;

      if (active && ours) {
        portalHadFsRef.current = true;
        return;
      }
      if (!active && portalHadFsRef.current) {
        portalHadFsRef.current = false;
        const v = videoRef.current;
        onDetachedClose({
          time: v?.currentTime ?? 0,
          play: v != null && !v.paused,
        });
      }
    };
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs);
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      document.removeEventListener("webkitfullscreenchange", syncFs);
    };
  }, [autoEnterFullscreen, onDetachedClose]);

  useLayoutEffect(() => {
    if (!autoEnterFullscreen || !containerRef.current) return;
    if (portalFsAttemptedRef.current) return;
    portalFsAttemptedRef.current = true;
    const el = containerRef.current;
    void (async () => {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else {
          const wk = (
            el as HTMLElement & { webkitRequestFullscreen?: () => void }
          ).webkitRequestFullscreen;
          if (wk) wk.call(el);
        }
      } catch {
        /* overlay fixed vẫn xem được */
      }
    })();
  }, [autoEnterFullscreen]);

  useEffect(() => {
    if (!autoEnterFullscreen || !onDetachedClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      if (document.fullscreenElement ?? doc.webkitFullscreenElement) return;
      e.preventDefault();
      onDetachedClose({
        time: videoRef.current?.currentTime ?? 0,
        play: videoRef.current != null && !videoRef.current.paused,
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [autoEnterFullscreen, onDetachedClose]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name);
    } else {
      openSafeUrl(attachment.url);
    }
  };

  const handleOpenInNewTab = () => {
    openSafeUrl(attachment.url);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else {
        trackView({ id: attachment.id, workspaceId: attachment.workspaceId });
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (isMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) videoRef.current.playbackRate = nextRate;
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFullscreen = async () => {
    if (useExternalFullscreen) {
      const v = videoRef.current;
      openPortal({
        sessionKey: `${message.id}-${attachment.id}-${Date.now()}`,
        message,
        attachment,
        onDownload,
        startTime: v?.currentTime ?? 0,
        wasPlaying: v != null ? !v.paused : false,
        volume: v?.volume ?? 1,
        muted: v?.muted ?? false,
        playbackRate,
      });
      v?.pause();
      return;
    }

    if (autoEnterFullscreen && onDetachedClose) {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const active =
        document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      try {
        if (active) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else await doc.webkitExitFullscreen?.();
        } else {
          onDetachedClose({
            time: videoRef.current?.currentTime ?? 0,
            play: videoRef.current != null && !videoRef.current.paused,
          });
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const el = containerRef.current;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const active =
      document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    try {
      if (!active) {
        if (!el) return;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else {
          const wk = (
            el as HTMLElement & {
              webkitRequestFullscreen?: () => void;
            }
          ).webkitRequestFullscreen;
          if (wk) wk.call(el);
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        await doc.webkitExitFullscreen?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isOpenElsewhere) {
    return (
      <div
        className={cn(
          "slack-video-preview-root relative w-full rounded-lg overflow-hidden border border-[#797c814d] bg-black",
          compact
            ? "h-full max-w-full min-h-0 min-w-0 border-[#dddddd] dark:border-[#35373B]"
            : "h-[260px] max-w-[500px]",
        )}
      >
        <div className="flex h-full min-h-[120px] w-full items-center justify-center px-3 text-center text-[12px] text-white/55">
          Đang phát toàn màn hình…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        // Không dùng state để set h-screen trong list (Virtuoso): làm ô tin nhắn phình full viewport → virtualizer unmount hàng → mất fullscreen / crash.
        "slack-video-preview-root group relative w-full rounded-lg overflow-hidden border border-[#797c814d] bg-black",
        compact
          ? "h-full max-w-full min-h-0 min-w-0 overflow-hidden border-[#dddddd] dark:border-[#35373B]"
          : "h-[260px] max-w-[500px]",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!formDetailPanel && !isFullscreen ? (
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

      {/* Video element */}
      <video
        ref={videoRef}
        src={attachment.url}
        className={cn(
          "cursor-pointer",
          compact && !isFullscreen
            ? "absolute inset-0 h-full w-full object-cover"
            : cn(
                "w-full h-auto",
                isFullscreen && "max-h-screen object-contain",
              ),
        )}
        onClick={togglePlay}
        preload="metadata"
      >
        <track kind="captions" />
      </video>

      {/* Big Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              "rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm transition-transform group-hover:scale-110",
              compact ? "w-10 h-10" : "w-16 h-16",
            )}
          >
            <LuPlay
              className={compact ? "ml-0.5" : "ml-1"}
              size={compact ? 22 : 32}
            />
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 flex flex-col gap-3 transition-opacity duration-300 ${
          isHovered || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        {(!compact || isFullscreen )&& (
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-mono font-medium">
              {fmtTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white transition-all hover:[&::-webkit-slider-thumb]:scale-125"
              style={{
                background: `linear-gradient(to right, white ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`,
              }}
            />
            <span className="text-white/80 text-xs font-mono">
              {fmtTime(duration)}
            </span>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-[#1d9bd1] transition-colors"
            >
              {isPlaying ? (
                <LuPause size={20} className="fill-current" />
              ) : (
                <LuPlay size={20} className="fill-current" />
              )}
            </button>

            {(!compact || isFullscreen) && (
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-[#1d9bd1] transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <LuVolumeX size={18} />
                  ) : (
                    <LuVolume2 size={18} />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white opacity-0 group-hover/vol:opacity-100 ml-2"
                  style={{
                    background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={cyclePlaybackRate}
              className="text-white hover:text-[#1d9bd1] text-[13px] font-bold transition-colors w-8"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>
            <button
              onClick={togglePiP}
              className="text-white hover:text-[#1d9bd1] transition-colors"
              title="Picture in Picture"
            >
              <MdPictureInPictureAlt size={19} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-[#1d9bd1] transition-colors"
              title="Fullscreen"
            >
              {isFullscreen || autoEnterFullscreen ? (
                <LuMinimize size={18} />
              ) : (
                <LuMaximize size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
