"use client"

import type { HuddleTarget } from "@/lib/huddle"
import type { HuddlePreviewTargetType } from "@/lib/open-huddle-preview-window"
import { defaultTheme, type Theme } from "@/stores/useThemeStore"
import {
  Track,
  type Participant,
  type TrackPublication,
} from "livekit-client"

export type DeviceState = {
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  videoInputs: MediaDeviceInfo[]
}

export type RuntimeStorageState = {
  live: boolean
  selectedMicId: string
  selectedSpeakerId: string
  selectedCameraId: string
  isMicEnabled: boolean
  isCameraEnabled: boolean
}

export const PREVIEW_STAGE_SIZE_CLASSES = "w-full max-w-[440px] aspect-[4/3]"

const RUNTIME_STORAGE_PREFIX = "slack-huddle-live"

export function buildRuntimeStorageKey(target: HuddleTarget) {
  return `${RUNTIME_STORAGE_PREFIX}:${target.workspaceId}:${target.entityType}:${target.entityId}`
}

export function readRuntimeStorage(target: HuddleTarget): RuntimeStorageState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(buildRuntimeStorageKey(target))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RuntimeStorageState>
    return {
      live: Boolean(parsed.live),
      selectedMicId: parsed.selectedMicId ?? "",
      selectedSpeakerId: parsed.selectedSpeakerId ?? "",
      selectedCameraId: parsed.selectedCameraId ?? "",
      isMicEnabled: parsed.isMicEnabled ?? true,
      isCameraEnabled: parsed.isCameraEnabled ?? true,
    }
  } catch {
    return null
  }
}

export function writeRuntimeStorage(target: HuddleTarget, state: RuntimeStorageState) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      buildRuntimeStorageKey(target),
      JSON.stringify(state),
    )
  } catch {
    // Ignore storage failures.
  }
}

export function clearRuntimeStorage(target: HuddleTarget) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(buildRuntimeStorageKey(target))
  } catch {
    // Ignore storage failures.
  }
}

export function formatDeviceLabel(device: MediaDeviceInfo, fallback: string) {
  const label = device.label.trim()
  return label || fallback
}

export function parseTheme(themeValue: string | null | undefined): Theme {
  if (!themeValue) return defaultTheme
  try {
    return JSON.parse(themeValue) as Theme
  } catch {
    return defaultTheme
  }
}

export function buildWorkspaceShellBackground(theme: Theme) {
  const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sysnav))`
  if (theme.isGradient) {
    const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sysnav))`
    return `linear-gradient(to bottom right, ${baseColor}, ${blendColor})`
  }
  return baseColor
}

export function getUserInitials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return "U"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
}

export function buildHeadline(entityType: HuddlePreviewTargetType, label: string) {
  if (entityType === "channel") return `Start huddle in # ${label}`
  return `Start huddle with ${label}`
}

export function buildLiveTitle(
  entityType: HuddlePreviewTargetType,
  label: string,
  topic?: string | null,
) {
  if (topic) {
    return `${topic} in #${label}`
  }
  if (entityType === "channel") return `Huddle in #${label}`
  return `Huddle with ${label}`
}

export function formatParticipantCount(count: number) {
  return `${count} ${count === 1 ? "person" : "people"}`
}

export function getParticipantDisplayName(participant: Participant, isLocal: boolean) {
  if (isLocal) return "You"
  return participant.name?.trim() || participant.identity || "Participant"
}

export function getPrimaryVideoPublication(participant: Participant) {
  return (
    participant.getTrackPublication(Track.Source.ScreenShare) ??
    participant.getTrackPublication(Track.Source.Camera) ??
    undefined
  )
}

export function getPrimaryVideoKind(publication?: TrackPublication) {
  if (!publication) return "camera"
  return publication.source === Track.Source.ScreenShare ? "screen" : "camera"
}

export type HuddleParticipantMetadata = {
  displayName?: string | null
  name?: string | null
  avatar?: string | null
  isRaisedHand?: boolean
}

export function parseHuddleParticipantMetadata(
  metadata: string | undefined,
): HuddleParticipantMetadata | null {
  if (!metadata) return null
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>
    return {
      displayName:
        typeof parsed.displayName === "string" ? parsed.displayName : null,
      name: typeof parsed.name === "string" ? parsed.name : null,
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : null,
      isRaisedHand: parsed.isRaisedHand === true,
    }
  } catch {
    return null
  }
}

export function readRaisedHandFromMetadata(metadata: string | undefined): boolean {
  return parseHuddleParticipantMetadata(metadata)?.isRaisedHand === true
}

export function buildHuddleParticipantMetadataPatch(
  metadata: string | undefined,
  patch: Partial<HuddleParticipantMetadata>,
): string {
  let existing: Record<string, unknown> = {}
  if (metadata) {
    try {
      existing = JSON.parse(metadata) as Record<string, unknown>
    } catch {
      existing = {}
    }
  }
  return JSON.stringify({ ...existing, ...patch })
}

export const HUDDLE_PREVIEW_WINDOW_WIDTH = 560
export const HUDDLE_PREVIEW_WINDOW_WIDTH_WITH_THREAD = 960
export const HUDDLE_PREVIEW_WINDOW_HEIGHT = 880

export function resizeHuddlePreviewWindow(withThread: boolean) {
  if (typeof window === "undefined") return

  const width = withThread
    ? HUDDLE_PREVIEW_WINDOW_WIDTH_WITH_THREAD
    : HUDDLE_PREVIEW_WINDOW_WIDTH
  const height = HUDDLE_PREVIEW_WINDOW_HEIGHT
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2))
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2))

  try {
    window.resizeTo(width, height)
    window.moveTo(left, top)
  } catch {
    // Some browsers block resizeTo on popups.
  }
}
