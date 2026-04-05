import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(mediaStream)
      
      const mediaRecorder = new MediaRecorder(mediaStream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        
        if (resolveStopRef.current) {
          resolveStopRef.current(blob)
          resolveStopRef.current = null
        }
        
        // Dừng tất cả track của microphone stream
        mediaStream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      setAudioBlob(null)

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Không thể truy cập microphone. Vui lòng cấp quyền.')
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        resolveStopRef.current = resolve
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      } else {
        resolve(null)
      }
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    // Stop all tracks if not stopped already
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }

    setIsRecording(false)
    setRecordingDuration(0)
    setStream(null)
    setAudioBlob(null)
    audioChunksRef.current = []
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    isRecording,
    recordingDuration,
    stream,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording
  }
}
