import { toast } from 'sonner'
import type { HuddleTarget } from "@/lib/huddle"

export type HuddlePreviewTargetType = 'channel' | 'dm'

export interface HuddlePreviewTarget {
  workspaceId: string
  entityType: HuddlePreviewTargetType
  entityId: string
  label: string
  mode?: 'start' | 'join'
  sessionId?: string
}

const HUDDLE_PREVIEW_WINDOW_NAME_PREFIX = 'slack-huddle-preview'
const HUDDLE_PREVIEW_MESSAGE_TYPE = 'slack-huddle-preview:leave-request'

type HuddlePreviewWindowHandle = {
  popup: Window
  windowName: string
}

const openHuddlePreviewWindows = new Map<string, HuddlePreviewWindowHandle>()

type HuddlePreviewRoomTarget = Pick<
  HuddleTarget,
  'workspaceId' | 'entityType' | 'entityId'
>

export function buildHuddlePreviewTargetKey(target: HuddlePreviewRoomTarget) {
  return [
    HUDDLE_PREVIEW_WINDOW_NAME_PREFIX,
    target.workspaceId,
    target.entityType,
    target.entityId,
  ].join(':')
}

function buildHuddlePreviewUrl(target: HuddlePreviewTarget) {
  const params = new URLSearchParams({
    workspaceId: target.workspaceId,
    entityType: target.entityType,
    entityId: target.entityId,
    label: target.label,
    mode: target.mode ?? 'start',
  })

  return `/huddle-preview?${params.toString()}`
}

function buildHuddlePreviewWindowName(target: HuddlePreviewTarget) {
  return buildHuddlePreviewTargetKey(target)
}

export function buildHuddlePreviewChannelName(target: HuddlePreviewRoomTarget) {
  return `${HUDDLE_PREVIEW_MESSAGE_TYPE}:${buildHuddlePreviewTargetKey(target)}`
}

export function openHuddlePreviewWindow(target: HuddlePreviewTarget) {
  if (typeof window === 'undefined') return false

  const url = buildHuddlePreviewUrl(target)
  const windowName = buildHuddlePreviewWindowName(target)
  const width = window.screen.availWidth
  const height = window.screen.availHeight
  const left = 0
  const top = 0

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',')

  const popup = window.open('', windowName, features)

  if (!popup) {
    toast.error('Trinh duyet da chan cua so preview huddle. Hay cho phep pop-up roi thu lai.')
    return false
  }

  openHuddlePreviewWindows.set(buildHuddlePreviewTargetKey(target), {
    popup,
    windowName,
  })

  const desiredUrl = new URL(url, window.location.origin).href

  if (popup.location.href !== desiredUrl) {
    popup.location.replace(desiredUrl)
  }

  popup.focus()
  return true
}

export function requestHuddlePreviewLeave(target: HuddlePreviewRoomTarget) {
  if (typeof window === 'undefined') return false

  const key = buildHuddlePreviewTargetKey(target)
  const handle = openHuddlePreviewWindows.get(key)
  let signaled = false

  if (handle?.popup && !handle.popup.closed) {
    try {
      handle.popup.postMessage(
        { type: HUDDLE_PREVIEW_MESSAGE_TYPE, targetKey: key },
        window.location.origin,
      )
      signaled = true
    } catch {
      // Ignore cross-window postMessage failures and fall back below.
    }
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(buildHuddlePreviewChannelName(target))
      channel.postMessage({ type: HUDDLE_PREVIEW_MESSAGE_TYPE, targetKey: key })
      channel.close()
      signaled = true
    } catch {
      // Ignore BroadcastChannel failures and fall back below.
    }
  }

  if (handle?.popup?.closed) {
    openHuddlePreviewWindows.delete(key)
  }

  return signaled
}
