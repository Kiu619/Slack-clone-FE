import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

export type VideoRecorderMode = 'idle' | 'preview' | 'recording' | 'review'

export function useVideoRecorder() {
  const [mode, setMode] = useState<VideoRecorderMode>('idle')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)

  const [recordingState, setRecordingState] = useState<'inactive' | 'recording' | 'paused'>('inactive')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null)

  // Canvas Compositing
  const proxyVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)

  // Setup proxy video and canvas loop once
  const ensureCompositor = useCallback(() => {
    if (!proxyVideoRef.current) {
      const video = document.createElement('video')
      video.muted = true
      video.autoplay = true
      // @ts-ignore
      video.playsInline = true
      video.style.position = 'absolute'
      video.style.width = '1px'
      video.style.height = '1px'
      video.style.opacity = '0'
      video.style.pointerEvents = 'none'
      document.body.appendChild(video)
      proxyVideoRef.current = video
    }

    if (!canvasRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      canvas.style.position = 'absolute'
      canvas.style.width = '1px'
      canvas.style.height = '1px'
      canvas.style.opacity = '0'
      canvas.style.pointerEvents = 'none'
      document.body.appendChild(canvas)
      canvasRef.current = canvas

      const ctx = canvas.getContext('2d')
      const draw = () => {
        const video = proxyVideoRef.current
        if (ctx && video && video.readyState >= 2 && !video.paused && !video.ended) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const vRatio = canvas.width / video.videoWidth
            const hRatio = canvas.height / video.videoHeight
            const ratio = Math.min(vRatio, hRatio)
            const cw = video.videoWidth * ratio
            const ch = video.videoHeight * ratio
            const cx = (canvas.width - cw) / 2
            const cy = (canvas.height - ch) / 2

            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, cx, cy, cw, ch)
          }
        } else if (ctx) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    }
    return { video: proxyVideoRef.current, canvas: canvasRef.current }
  }, [])

  const setProxySource = useCallback((stream: MediaStream | null) => {
    const { video } = ensureCompositor()
    if (video.srcObject !== stream) {
      video.srcObject = stream
      if (stream) {
        video.play().catch(e => console.warn('Proxy video play failed', e))
      }
    }
  }, [ensureCompositor])

  /**
   * Start camera preview
   */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // video: { width: 1280, height: 720 },
        video: true,
        audio: true,
      })
      setCameraStream(stream)
      setMode('preview')
      setProxySource(stream)
    } catch (error) {
      console.error(error)
      toast.error('Cannot access camera. Please grant permission.')
    }
  }, [setProxySource])

  /**
   * Start screen share
   */
  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      setScreenStream(screen)
      setProxySource(screen)

      // Auto-stop handler (browser bar)
      screen.getVideoTracks()[0].addEventListener('ended', () => {
        setScreenStream(null)
        // Fallback to camera
        setProxySource(cameraStream)
      })
    } catch (error) {
      console.error(error)
    }
  }, [cameraStream, setProxySource])

  /**
   * Stop Screen Share
   */
  const stopScreenShare = useCallback(() => {
    screenStream?.getTracks().forEach(t => t.stop())
    setScreenStream(null)
    setProxySource(cameraStream)
  }, [screenStream, cameraStream, setProxySource])

  /**
   * Start recording
   */
  const startRecording = useCallback(() => {
    const { canvas } = ensureCompositor()
    const sourceStream = screenStream || cameraStream
    if (!sourceStream) return

    // @ts-ignore
    const canvasStream = canvas.captureStream?.(30) || canvas.mozCaptureStream?.(30)
    
    if (!canvasStream) {
      toast.error('Trình duyệt không hỗ trợ quay video (Canvas error).')
      return
    }

    const recordStream = new MediaStream()
    
    // 1. Add resilient video track from canvas
    canvasStream.getVideoTracks().forEach((t: MediaStreamTrack) => recordStream.addTrack(t))

    // 2. Add audio track (prefer camera mic so it never stops when screen share ends)
    const audioTrack = cameraStream?.getAudioTracks()[0] || screenStream?.getAudioTracks()[0]
    if (audioTrack) {
      recordStream.addTrack(audioTrack)
    }

    chunksRef.current = []
    const mediaRecorder = new MediaRecorder(recordStream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    })
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setVideoBlob(blob)
      setRecordingState('inactive')
      if (resolveStopRef.current) {
        resolveStopRef.current(blob)
        resolveStopRef.current = null
      }
    }

    mediaRecorder.start()
    setMode('recording')
    setRecordingState('recording')
    setRecordingDuration(0)

    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1)
    }, 1000)
  }, [cameraStream, screenStream, ensureCompositor])

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'recording') {
      recorder.pause()
      setRecordingState('paused')
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'paused') {
      recorder.resume()
      setRecordingState('recording')
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    }
  }, [])

  /**
   * Stop recording
   */
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        resolveStopRef.current = (blob) => {
          setMode('review')
          resolve(blob)
        }
        recorder.stop()
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      } else {
        resolve(null)
      }
    })
  }, [])

  /**
   * Toggle mic
   */
  const toggleMic = useCallback(() => {
    const stream = cameraStream || screenStream
    stream?.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled
    })
    setIsMicMuted(p => !p)
  }, [cameraStream, screenStream])

  /**
   * Toggle camera
   */
  const toggleCamera = useCallback(() => {
    cameraStream?.getVideoTracks().forEach(t => {
      t.enabled = !t.enabled
    })
    setIsCameraOff(p => !p)
  }, [cameraStream])

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    cameraStream?.getTracks().forEach(t => t.stop())
    screenStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setScreenStream(null)
    setVideoBlob(null)
    setRecordingDuration(0)
    setMode('idle')
    setRecordingState('inactive')
    setIsMicMuted(false)
    setIsCameraOff(false)

    // Cleanup compositor
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (proxyVideoRef.current) {
      proxyVideoRef.current.srcObject = null
      proxyVideoRef.current.remove()
      proxyVideoRef.current = null
    }
    if (canvasRef.current) {
      canvasRef.current.remove()
      canvasRef.current = null
    }
  }, [cameraStream, screenStream])

  /**
   * Full cleanup
   */
  const cleanup = useCallback(() => {
    reset()
  }, [reset])

  return {
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
  }
}

