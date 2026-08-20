/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { CustomSelect } from "@/components/custom-select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { LuRefreshCw, LuVideo } from "react-icons/lu";
import { useHuddle } from "@/hooks/use-translation";

type CameraDeviceSelectorPopoverProps = {
  children: React.ReactNode // chevron trigger
  isCameraEnabled: boolean
  videoInputs: MediaDeviceInfo[]
  selectedCameraId: string
  onSelectCamera: (deviceId: string) => void // chỉ gọi khi confirm
  onToggleCamera: () => void // bật camera khi nhấn "Turn On"
  onRefresh: () => void
}

export function CameraDeviceSelectorPopover({
  children,
  isCameraEnabled,
  videoInputs,
  selectedCameraId,
  onSelectCamera,
  onToggleCamera,
  onRefresh,
}: CameraDeviceSelectorPopoverProps) {
  const t = useHuddle()
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingCameraId, setPendingCameraId] = useState(selectedCameraId)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Reset pending camera khi popover mở
  useEffect(() => {
    if (open) {
      setPendingCameraId(selectedCameraId)
    }
  }, [open, selectedCameraId])

  // Tạo preview stream khi popover mở (luôn bật camera preview trong popover)
  useEffect(() => {
    if (!open) {
      setPreviewStream(null)
      return
    }

    let cancelled = false
    let currentStream: MediaStream | null = null

    const createPreview = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: pendingCameraId
            ? { deviceId: { exact: pendingCameraId } }
            : true,
        }
        currentStream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!cancelled) {
          setPreviewStream(currentStream)
        } else {
          currentStream.getTracks().forEach((t) => t.stop())
        }
      } catch {
        if (!cancelled) {
          setPreviewStream(null)
        }
      }
    }

    void createPreview()

    return () => {
      cancelled = true
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [open, pendingCameraId])

  // Sync preview stream to video element
  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    if (!previewStream) {
      element.srcObject = null
      return
    }

    element.srcObject = previewStream
    void element.play().catch(() => {})

    return () => {
      if (element.srcObject === previewStream) {
        element.srcObject = null
      }
    }
  }, [previewStream])

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const handleConfirm = () => {
    if (!isCameraEnabled) {
      onToggleCamera()
    }
    onSelectCamera(pendingCameraId)
    setOpen(false)
  }

  const cameraOptions = videoInputs.map((device, index) => ({
    value: device.deviceId,
    label: device.label || `Camera ${index + 1}`,
  }))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="flex w-80 flex-col gap-3 p-3"
        align="center"
        sideOffset={8}
        withOverlay
      >
        {/* Video Preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
          {previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <LuVideo size={32} className="text-neutral-400" />
            </div>
          )}
        </div>

        {/* Camera Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-1">
            <LuVideo size={14} className="text-neutral-500 dark:text-neutral-400" />
            <Typography
              text={t("camera")}
              variant="p"
              className="text-[11px]! font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
            />
          </div>
          <CustomSelect
            options={cameraOptions}
            value={pendingCameraId}
            onChange={(id) => setPendingCameraId(id)}
            placeholder={t("selectCamera")}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <LuRefreshCw size={13} className={cn(refreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleConfirm}
            className="h-7 gap-1.5 text-xs"
          >
            {isCameraEnabled ? t("switch") : t("turnOn")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
