"use client"

import { Button } from "@/components/ui/button"
import Typography from "@/components/ui/typography"
import {
  DeviceSelect,
  PreviewAvatar,
} from "@/modules/huddle-preview/huddle-preview.media"
import { PREVIEW_STAGE_SIZE_CLASSES } from "@/modules/huddle-preview/huddle-preview.utils"
import { useHuddle } from "@/hooks/use-translation"
import { cn } from "@/lib/utils"
import { RiCloseLine, RiHeadphoneLine, RiMicLine, RiVolumeUpLine, RiVideoLine } from "react-icons/ri"
import { LuMic, LuMicOff, LuVideo, LuVideoOff } from "react-icons/lu"
import { useEffect, useRef } from "react"
import type { HuddlePreviewPhase } from "@/modules/huddle-preview/hooks/use-huddle-preview-window"

type HuddlePreviewStageProps = {
  phase: HuddlePreviewPhase
  headline: string
  currentUserAvatar: string | null
  currentUserLabel: string
  previewStream: MediaStream | null
  previewStatus: "idle" | "loading" | "ready" | "error" | "blocked"
  previewError: string | null
  liveError: string | null
  isMicEnabled: boolean
  isCameraEnabled: boolean
  selectedMicId: string
  selectedSpeakerId: string
  selectedCameraId: string
  micOptions: Array<{ value: string; label: string }>
  speakerOptions: Array<{ value: string; label: string }>
  cameraOptions: Array<{ value: string; label: string }>
  onSelectMic: (value: string) => void
  onSelectSpeaker: (value: string) => void
  onSelectCamera: (value: string) => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onCancel: () => void
  onStart: () => void
  startButtonLabel: string
}

export function HuddlePreviewStage({
  phase,
  headline,
  currentUserAvatar,
  currentUserLabel,
  previewStream,
  previewStatus,
  previewError,
  liveError,
  isMicEnabled,
  isCameraEnabled,
  selectedMicId,
  selectedSpeakerId,
  selectedCameraId,
  micOptions,
  speakerOptions,
  cameraOptions,
  onSelectMic,
  onSelectSpeaker,
  onSelectCamera,
  onToggleMic,
  onToggleCamera,
  onCancel,
  onStart,
  startButtonLabel,
}: HuddlePreviewStageProps) {
  const t = useHuddle()
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const phaseLabel =
    phase === "connecting" ? t("connecting") : t("preview")
  const subLabel =
    phase === "connecting"
      ? t("preparingYourHuddle")
      : t("checkAudioAndCamera")

  useEffect(() => {
    const element = previewVideoRef.current
    if (!element) return

    const currentStream = previewStream
    if (!currentStream) {
      element.srcObject = null
      return
    }

    element.srcObject = currentStream
    void element.play().catch(() => {})

    return () => {
      if (element.srcObject === currentStream) {
        element.srcObject = null
      }
    }
  }, [previewStream])

  useEffect(() => {
    const element = previewVideoRef.current
    if (!element || !selectedSpeakerId || !("setSinkId" in element)) return
    void element.setSinkId(selectedSpeakerId).catch(() => {})
  }, [selectedSpeakerId])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto max-w-[760px]  rounded-[24px] p-3.5 shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
      <div className="flex flex-none items-center justify-between rounded-[16px]  px-3.5 py-2.5">
        <div className="min-w-0">
          <Typography
            text={headline}
            variant="h3"
            className="truncate text-[15px]! font-semibold"
          />
          <Typography
            text={subLabel}
            variant="p"
            className="mt-0.5 text-[12px]! text-muted-foreground"
          />
        </div>
        <div className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/88">
          {phaseLabel}
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[20px] p-3.5">
        <div className="flex w-full flex-1 items-center justify-center">
          <div
            className={cn(
              "relative flex",
              PREVIEW_STAGE_SIZE_CLASSES,
              "items-center justify-center overflow-hidden rounded-[20px]",
            )}
          >
            <div className="absolute inset-0 rounded-[20px] bg-[#f0d311]" />
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full rounded-[20px] object-cover transition-opacity duration-200"
              style={{
                opacity: previewStream && isCameraEnabled ? 1 : 0,
              }}
            />
            <div
              className="transition-opacity duration-200"
              style={{
                opacity: !previewStream || !isCameraEnabled ? 1 : 0,
              }}
            >
              <PreviewAvatar
                avatarSrc={currentUserAvatar}
                avatarAlt={currentUserLabel}
              />
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
              <Button
                type="button"
                size="custom"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7b6847] text-white shadow-[0_10px_18px_rgba(0,0,0,0.18)] hover:bg-[#8a764b]"
                onClick={onToggleMic}
                aria-label={isMicEnabled ? t("muteMicrophone") : t("unmuteMicrophone")}
              >
                {isMicEnabled ? <LuMic size={20} /> : <LuMicOff size={20} />}
              </Button>
              <Button
                type="button"
                size="custom"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7b6847] text-white shadow-[0_10px_18px_rgba(0,0,0,0.18)] hover:bg-[#8a764b]"
                onClick={onToggleCamera}
                aria-label={isCameraEnabled ? t("turnCameraOff") : t("turnCameraOn")}
              >
                {isCameraEnabled ? <LuVideo size={20} /> : <LuVideoOff size={20} />}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid w-full grid-cols-1 gap-2.5 md:grid-cols-3">
          <DeviceSelect
            icon={<RiMicLine size={16} />}
            label={t("microphone")}
            value={selectedMicId}
            onChange={onSelectMic}
            options={micOptions}
          />
          <DeviceSelect
            icon={<RiVolumeUpLine size={16} />}
            label={t("speaker")}
            value={selectedSpeakerId}
            onChange={onSelectSpeaker}
            options={speakerOptions}
          />
          <DeviceSelect
            icon={<RiVideoLine size={16} />}
            label={t("camera")}
            value={selectedCameraId}
            onChange={onSelectCamera}
            options={cameraOptions}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {previewStatus === "blocked" || previewStatus === "error" ? (
            <div className="rounded-[14px] border border-red-400/25 bg-red-500/12 px-3.5 py-2 text-sm text-red-100">
              {previewError ??
                t("cameraAndMicPermission")}
            </div>
          ) : null}
          {liveError ? (
            <div className="rounded-[14px] border border-amber-300/25 bg-amber-500/12 px-3.5 py-2 text-sm text-amber-50">
              {liveError}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-none items-center justify-between gap-3 rounded-[18px] bg-black/10 px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            size="custom"
            className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-white hover:bg-white/14"
            onClick={onCancel}
          >
            <RiCloseLine size={18} />
            <Typography text={t("cancel")} variant="p" className="text-[14px]! text-white" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="custom"
            className="flex h-11 items-center gap-2 rounded-full bg-[#c6e5f2] px-4 text-[#0f344e] shadow-[0_10px_18px_rgba(0,0,0,0.18)] hover:bg-[#b8dbea] disabled:opacity-100"
            onClick={onStart}
            disabled={phase === "connecting"}
          >
            <RiHeadphoneLine size={18} />
            <Typography
              text={startButtonLabel}
              variant="p"
              className="text-[14px]! font-semibold text-[#0f344e]"
            />
          </Button>
        </div>
      </div>
    </div>
  )
}
