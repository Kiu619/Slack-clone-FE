'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LuMic,
  LuMicOff,
  LuVideo,
  LuVideoOff,
  LuMonitor,
  LuCloud,
  LuDownload,
  LuRefreshCw,
  LuPlay,
  LuPause,
  LuSquare,
  LuMonitorOff,
} from 'react-icons/lu'
import { useVideoRecorder } from '@/hooks/use-video-recorder'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogBody,
  CustomDialogFooter,
} from '@/components/custom-dialog'
import { Button } from '../ui/button'
import Typography from '../ui/typography'
import { MdOutlineCloudDownload } from 'react-icons/md'

// Helper
function fmtTime(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface RecordVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileAttach?: (files: File[]) => void
}

export default function RecordVideoDialog({
  open,
  onOpenChange,
  onFileAttach,
}: RecordVideoDialogProps) {
  const {
    mode,
    recordingState,
    cameraStream,
    screenStream,
    recordingDuration,
    videoBlob,
    isMicMuted,
    isCameraOff,
    startCamera,
    startScreenShare,
    stopScreenShare,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleMic,
    toggleCamera,
    reset,
    cleanup,
  } = useVideoRecorder()

  const LIMIT_SEC = 300 // 5 minutes

  // Handle keyboard Pause/Resume
  useEffect(() => {
    if (mode !== 'recording') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing elsewhere (though unlikely in this dialog)
      if (e.code === 'Space') {
        e.preventDefault()
        if (recordingState === 'recording') {
          pauseRecording()
        } else if (recordingState === 'paused') {
          resumeRecording()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, recordingState, pauseRecording, resumeRecording])

  // -- Review state --
  const [reviewPlaying, setReviewPlaying] = useState(false)
  const [reviewTime, setReviewTime] = useState(0)
  const [reviewDuration, setReviewDuration] = useState(0)
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null)

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const reviewVideoRef = useRef<HTMLVideoElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Kick off camera when dialog opens
  useEffect(() => {
    if (open && mode === 'idle') {
      startCamera()
    }
  }, [open, mode, startCamera])

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      cleanup()
      setReviewPlaying(false)
      setReviewTime(0)
      setReviewDuration(0)
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl)
        setVideoObjectUrl(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Wire live camera stream to video element
  useEffect(() => {
    if (!liveVideoRef.current) return
    const stream = screenStream || cameraStream
    liveVideoRef.current.srcObject = stream
    liveVideoRef.current.play().catch(() => { })
  }, [cameraStream, screenStream])

  // PiP camera when screen sharing
  useEffect(() => {
    if (!pipVideoRef.current || !screenStream || !cameraStream) return
    pipVideoRef.current.srcObject = cameraStream
    pipVideoRef.current.play().catch(() => { })
  }, [cameraStream, screenStream])

  // Create object URL for review
  useEffect(() => {
    if (videoBlob && mode === 'review') {
      const url = URL.createObjectURL(videoBlob)
      setVideoObjectUrl(url)
      setReviewTime(0)
      setReviewPlaying(false)
    }
  }, [videoBlob, mode])

  // Review playback event handlers
  const handleReviewTimeUpdate = () => {
    if (reviewVideoRef.current) setReviewTime(reviewVideoRef.current.currentTime)
  }
  const handleReviewLoaded = () => {
    if (reviewVideoRef.current) setReviewDuration(reviewVideoRef.current.duration)
  }
  const handleReviewEnded = () => {
    setReviewPlaying(false)
    setReviewTime(0)
    if (reviewVideoRef.current) reviewVideoRef.current.currentTime = 0
  }

  const toggleReviewPlay = () => {
    if (!reviewVideoRef.current) return
    if (reviewPlaying) {
      reviewVideoRef.current.pause()
    } else {
      reviewVideoRef.current.play()
    }
    setReviewPlaying(p => !p)
  }

  const handleReviewSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value)
    if (reviewVideoRef.current) reviewVideoRef.current.currentTime = t
    setReviewTime(t)
  }

  // Done — attach file
  const handleDone = useCallback(() => {
    if (!videoBlob) return
    const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([videoBlob], `video_clip_${Date.now()}.${ext}`, { type: videoBlob.type })
    onFileAttach?.([file])
    onOpenChange(false)
  }, [videoBlob, onFileAttach, onOpenChange])

  // Download recorded video
  const handleDownload = () => {
    if (!videoObjectUrl) return
    const a = document.createElement('a')
    a.href = videoObjectUrl
    a.download = `video_clip_${Date.now()}.webm`
    a.click()
  }

  // Upload existing video
  const handleUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    onFileAttach?.(Array.from(files))
    onOpenChange(false)
  }

  // Start Over
  const handleStartOver = () => {
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl)
      setVideoObjectUrl(null)
    }
    reset()
    startCamera()
  }

  // Handle Stop recording
  const handleStop = async () => {
    console.log('Stop button clicked!')
    await stopRecording()
  }

  const isScreenSharing = !!screenStream

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="720px">
      {/* ── PREVIEW / RECORDING STATE ── */}
      {(mode === 'preview' || mode === 'recording') && (
        <>
          <CustomDialogHeader onOpenChange={onOpenChange} className="px-5 py-3 border-[#797c814d]">
            <div className="flex items-center gap-3">
              <Typography variant="h4">Record video clip</Typography>
              {/* {mode === 'recording' && (
                <div className="flex items-center gap-2 text-red-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-sm font-mono font-medium">{fmtTime(recordingDuration)}</span>
                </div>
              )} */}
            </div>
          </CustomDialogHeader>

          <CustomDialogBody className="p-0 bg-black overflow-hidden relative h-[600px]">
            {/* Main video (screen or camera) */}
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />

            {/* PiP camera bubble when screen sharing */}
            {isScreenSharing && cameraStream && (
              <div className="absolute bottom-3 right-3 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-black">
                <video
                  ref={pipVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Controls overlay in body (Slack hides footer during recording sometimes or keeps it slim) */}
            <div className="absolute bottom-0 left-0 p-3 bg-linear-to-t from-black/60 to-transparent flex justify-center gap-4">

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleCamera}
                    className={`p-2 rounded-full transition-colors ${isCameraOff ? 'bg-red-500/20 text-red-500' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    {isCameraOff ? <LuVideoOff size={18} /> : <LuVideo size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{isCameraOff ? 'Turn on camera' : 'Turn off camera'}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleMic}
                    className={`p-2 rounded-full transition-colors ${isMicMuted ? 'bg-red-500/20 text-red-500' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    {isMicMuted ? <LuMicOff size={18} /> : <LuMic size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{isMicMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
              </Tooltip>

            </div>
          </CustomDialogBody>

          <CustomDialogFooter className="flex-col px-5 py-4 border-[#797c814d] dark:bg-[#1A1D21] gap-4">
            {/* 1. Progress Bar (only during recording) */}
            {mode === 'recording' && (
              <div className="w-full">
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1d9bd1] transition-all duration-300"
                    style={{ width: `${(recordingDuration / LIMIT_SEC) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="w-full flex items-center justify-between">
              {/* Left: Duration / Limit or Upload */}
              <div className="flex items-center gap-3">
                {mode === 'recording' ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-[13px] font-bold">
                      {fmtTime(recordingDuration)} / {fmtTime(LIMIT_SEC)}
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleUploadSelect}
                    />
                    <Button
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm font-bold"
                    >
                      <LuCloud size={16} />
                      Upload Video
                    </Button>
                  </>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-3">
                {mode === 'preview' && (
                  <>
                    {
                      !isScreenSharing ? (
                        <Button
                          onClick={startScreenShare}
                          className="flex items-center gap-1.5 rounded font-bold text-sm"
                        >
                          <LuMonitor size={16} />
                          Share Screen
                        </Button>
                      ) : (
                        <Button
                          onClick={stopScreenShare}
                          className="flex items-center gap-1.5 rounded font-bold text-sm"
                        >
                          <LuMonitorOff size={16} />
                          Stop Sharing
                        </Button>
                      )
                    }
                    <Button
                      variant="error"
                      onClick={startRecording}
                      className='font-bold'
                    >
                      Record
                    </Button>
                  </>
                )}

                {mode === 'recording' && (
                  <>
                    {/* Stop Sharing / Share Screen toggle during recording */}
                    {isScreenSharing ? (
                      <Button
                        onClick={stopScreenShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 font-bold"
                      >
                        <LuMonitor size={16} />
                        Stop Sharing
                      </Button>
                    ) : (
                      <Button
                        onClick={startScreenShare}
                        className="flex items-center gap-1.5 px-3 py-1.5 font-bold"
                      >
                        <LuMonitor size={16} />
                        Share Screen
                      </Button>
                    )}

                    {/* Pause / Resume */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            if (recordingState === 'recording') pauseRecording();
                            else resumeRecording();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 font-bold"
                        >
                          {recordingState === 'recording' ? (
                            <>
                              <LuPause size={16} className="fill-current" />
                              Pause
                            </>
                          ) : (
                            <>
                              <LuPlay size={16} className="fill-current" />
                              Resume
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{recordingState === 'recording' ? 'Press Space to pause' : 'Press Space to resume'}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Stop (End recording) */}
                    <Button
                      onClick={handleStop}
                      variant="error"
                      className='font-bold'
                    >
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CustomDialogFooter>
        </>
      )}

      {/* ── REVIEW STATE ── */}
      {mode === 'review' && videoObjectUrl && (
        <>
          <CustomDialogHeader onOpenChange={onOpenChange} className="px-5 py-3 border-[#797c814d]">
            <Button
              onClick={handleStartOver}
              className="flex items-center gap-1.5 font-bold"
            >
              <LuRefreshCw size={16} />
              Start Over
            </Button>
          </CustomDialogHeader>

          <CustomDialogBody className="p-0 bg-black overflow-hidden relative h-[600px]">
            <video
              ref={reviewVideoRef}
              src={videoObjectUrl}
              onTimeUpdate={handleReviewTimeUpdate}
              onLoadedMetadata={handleReviewLoaded}
              onEnded={handleReviewEnded}
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Progress bar overlay at bottom of video */}
            <div className="absolute bottom-0 left-0 right-0 px-5 py-2 bg-linear-to-t from-black/60 to-transparent">
              <input
                type="range"
                min={0}
                max={reviewDuration || 100}
                value={reviewTime}
                onChange={handleReviewSeek}
                className="w-full h-1 bg-[#797c8150] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1d9bd1]"
                style={{
                  background: `linear-gradient(to right, #1d9bd1 ${(reviewTime / (reviewDuration || 1)) * 100}%, #797c8150 ${(reviewTime / (reviewDuration || 1)) * 100}%)`
                }}
              />
            </div>
          </CustomDialogBody>

          <CustomDialogFooter className="justify-between px-5 py-3 border-[#797c814d] dark:bg-[#1A1D21]">
            {/* Left: Play + time */}
            <div className="flex items-center">
              <Button
                onClick={toggleReviewPlay}
                className=""
              >
                {reviewPlaying
                  ? <LuPause size={16} className="fill-current" />
                  : <LuPlay size={16} className="fill-current" />
                }
              </Button>
              <span className="text-[13px] font-bold text-center">
                {fmtTime(reviewTime)} / {fmtTime(reviewDuration)}
              </span>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-[13px] font-bold"
              >
                <MdOutlineCloudDownload size={15} />
                Download
              </Button>
              <Button
                onClick={handleDone}
                className="font-semibold"
                variant="success"
              >
                Done
              </Button>
            </div>
          </CustomDialogFooter>
        </>
      )}
    </CustomDialog>
  )
}

