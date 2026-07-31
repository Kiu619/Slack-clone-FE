import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Button } from './ui/button'

interface EditorAudioRecorderProps {
  isRecording: boolean
  recordingDuration: number
  stream: MediaStream | null
  onCancel: () => void
  onConfirm: () => void // user stops recording & automatically attaches it
}

export default function  EditorAudioRecorder({
  isRecording,
  recordingDuration,
  stream,
  onCancel,
  onConfirm,
}: EditorAudioRecorderProps) {
  // Format the duration into mm:ss
  const formattedDuration = format(recordingDuration * 1000, 'mm:ss')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!stream || !canvasRef.current) return

    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const canvas = canvasRef.current
    const canvasCtx = canvas.getContext('2d')
    if (!canvasCtx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let animationId: number

    const draw = () => {
      animationId = requestAnimationFrame(draw)
      const { width, height } = canvas
      
      analyser.getByteFrequencyData(dataArray)
      
      canvasCtx.clearRect(0, 0, width, height)
      
      const barWidth = 3
      const barGap = 2
      const barCount = Math.floor(width / (barWidth + barGap))
      
      let x = 0
      for (let i = 0; i < barCount; i++) {
        // Smooth out the representation by mapping it
        const v = dataArray[i] / 255.0 
        const barHeight = Math.max(v * height * 1.5, 3) 
        
        const y = (height - barHeight) / 2 // center vertically
        
        if (canvasCtx.roundRect) {
            canvasCtx.beginPath()
            canvasCtx.roundRect(x, y, barWidth, barHeight, 2)
            canvasCtx.fillStyle = '#1d9bd1'
            canvasCtx.fill()
        } else {
            canvasCtx.fillStyle = '#1d9bd1'
            canvasCtx.fillRect(x, y, barWidth, barHeight)
        }
        
        x += barWidth + barGap
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      audioCtx.close().catch(() => {})
    }
  }, [stream])

  return (
    <div className="flex items-center min-h-[50px] px-4 bg-[#f8f8f8] dark:bg-[#222529] rounded-lg m-1 mr-2 w-[calc(100%-12px)]">
      {/* Waveform Visualization (Real-time Canvas) */}
      <div className="flex-1 flex items-center h-full mr-4 overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-8" width={300} height={32} />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Timer */}
        <div className="flex items-center gap-2">
          {/* Pulsing red dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[13px] font-medium text-black dark:text-[#d1d2d3] font-mono">
            {formattedDuration}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Stop / Cancel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCancel}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-red-500/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LuX size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Cancel</p>
            </TooltipContent>
          </Tooltip>

          {/* Confirm / Attach */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onConfirm}
                className="flex items-center justify-center w-8 h-8 rounded-full"
                variant="success"
              >
                <LuCheck size={16} strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Done</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
