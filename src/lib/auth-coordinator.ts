'use client'

export type RefreshResult = 'success' | 'expired' | 'unavailable'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const LAST_REFRESH_KEY = 'slack-auth:last-refresh-at'
const CROSS_TAB_GRACE_MS = 10_000
let pending: Promise<RefreshResult> | null = null
let started = false
let channel: BroadcastChannel | null = null
const listeners = new Set<(event: 'refreshed' | 'expired' | 'signed-out') => void>()

function getLastRefresh(): number {
  try {
    return Number(window.localStorage.getItem(LAST_REFRESH_KEY) ?? 0)
  } catch {
    return 0
  }
}

function setLastRefresh(value: number | null) {
  try {
    if (value == null) window.localStorage.removeItem(LAST_REFRESH_KEY)
    else window.localStorage.setItem(LAST_REFRESH_KEY, String(value))
  } catch {
    // Private browsing/storage policy may disable localStorage. Web Locks and
    // backend atomic rotation still preserve correctness.
  }
}

function emit(event: 'refreshed' | 'expired' | 'signed-out', broadcast = true) {
  for (const listener of listeners) listener(event)
  if (broadcast) channel?.postMessage(event)
}

export function onAuthEvent(listener: (event: 'refreshed' | 'expired' | 'signed-out') => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifySignedOut() {
  if (typeof window !== 'undefined') setLastRefresh(null)
  emit('signed-out')
}

export function notifySignedIn() {
  if (typeof window !== 'undefined') {
    setLastRefresh(Date.now())
  }
  emit('refreshed')
}

async function doRefresh(): Promise<RefreshResult> {
  const recent = getLastRefresh()
  if (recent > 0 && Date.now() - recent < CROSS_TAB_GRACE_MS) return 'success'
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', credentials: 'include', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.ok) {
      setLastRefresh(Date.now())
      emit('refreshed')
      return 'success'
    }
    if (response.status === 401) {
      let code: string | undefined
      try {
        code = ((await response.clone().json()) as { code?: string }).code
      } catch {
        code = undefined
      }
      if (code === 'SESSION_EXPIRED' || code === 'TOKEN_REVOKED') {
        emit('expired')
        return 'expired'
      }
      return 'unavailable'
    }
    return 'unavailable'
  } catch { return 'unavailable' }
}

export function refreshAuth(): Promise<RefreshResult> {
  if (pending) return pending
  pending = (async () => {
    // Web Locks coordinates tabs in supporting browsers. The backend's atomic
    // session rotation remains authoritative when Web Locks is unavailable.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request('slack-auth-refresh', async () => {
        // Tab trước có thể đã refresh trong lúc tab này chờ lock.
        const recent = getLastRefresh()
        if (recent > 0 && Date.now() - recent < CROSS_TAB_GRACE_MS) return 'success'
        return doRefresh()
      })
    }
    return doRefresh()
  })().finally(() => { pending = null })
  return pending
}

export function startAuthCoordinator() {
  if (started || typeof window === 'undefined') return
  started = true
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('slack-auth')
    channel.onmessage = (message: MessageEvent) => {
      if (message.data === 'refreshed' || message.data === 'expired' || message.data === 'signed-out') {
        if (message.data === 'refreshed') {
          setLastRefresh(Date.now())
        } else {
          setLastRefresh(null)
        }
        emit(message.data, false)
      }
    }
  }
  const check = () => {
    if (document.visibilityState === 'visible' && navigator.onLine &&
      !window.location.pathname.startsWith('/auth')) void refreshAuth()
  }
  window.setInterval(check, 5 * 60_000)
  window.addEventListener('focus', check)
  window.addEventListener('online', check)
  document.addEventListener('visibilitychange', check)
}
