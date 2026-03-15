'use client'

import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY_PREFIX = 'slack-clone:attachment-expanded'

function getStorageKey(messageId: string) {
  return `${STORAGE_KEY_PREFIX}:${messageId}`
}

const listeners = new Set<() => void>()
let hasDeferred = false
let rafScheduled = false

function getSnapshot(messageId: string): boolean {
  if (typeof window === 'undefined') return true
  // Tránh hydration mismatch: trước lần notify đầu tiên, luôn trả về true
  if (!hasDeferred) return true
  const stored = localStorage.getItem(getStorageKey(messageId))
  return stored !== null ? stored === '1' : true
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!hasDeferred && !rafScheduled) {
    rafScheduled = true
    requestAnimationFrame(() => {
      hasDeferred = true
      rafScheduled = false
      listeners.forEach((fn) => fn())
    })
  }
  return () => listeners.delete(cb)
}

function setStored(messageId: string, value: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(messageId), value ? '1' : '0')
  listeners.forEach((fn) => fn())
}

export function useAttachmentExpanded(messageId: string) {
  const getClientSnapshot = useCallback(() => getSnapshot(messageId), [messageId])
  const getServerSnapshot = useCallback(() => true, [])

  const isExpanded = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  )

  const toggle = useCallback(() => {
    const next = !getSnapshot(messageId)
    setStored(messageId, next)
  }, [messageId])

  return [isExpanded, toggle] as const
}
