"use client";

import type { Message, MessageAttachment } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import FileToolbar from "./file-toolbar";
import { LuPlay, LuPause, LuVolume2, LuVolumeX, LuMaximize, LuMinimize } from "react-icons/lu";
import { MdPictureInPictureAlt } from "react-icons/md";

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
}

export default function VideoPreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: VideoPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name);
    } else {
      window.open(attachment.url, "_blank");
    }
  };

  const handleOpenInNewTab = () => {
    window.open(attachment.url, "_blank");
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`group relative w-full h-[260px] rounded-lg overflow-hidden border border-[#797c814d] bg-black ${
        isFullscreen ? "h-screen flex items-center justify-center" : "max-w-[500px]"
      }`}
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
        />
      ) : null}

      {/* Video element */}
      <video
        ref={videoRef}
        src={attachment.url}
        className={`w-full h-auto cursor-pointer ${isFullscreen ? "max-h-screen object-contain" : ""}`}
        onClick={togglePlay}
        preload="metadata"
      >
        <track kind="captions" />
      </video>

      {/* Big Play Button Overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm transition-transform group-hover:scale-110">
            <LuPlay size={32} className="ml-1" />
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
        <div className="flex items-center gap-3">
          <span className="text-white text-xs font-mono font-medium">{fmtTime(currentTime)}</span>
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
          <span className="text-white/80 text-xs font-mono">{fmtTime(duration)}</span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-[#1d9bd1] transition-colors">
              {isPlaying ? <LuPause size={20} className="fill-current" /> : <LuPlay size={20} className="fill-current" />}
            </button>

            <div className="flex items-center gap-1 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-[#1d9bd1] transition-colors">
                {isMuted || volume === 0 ? <LuVolumeX size={18} /> : <LuVolume2 size={18} />}
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
              {isFullscreen ? <LuMinimize size={18} /> : <LuMaximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
