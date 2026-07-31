'use client'

import { useCallback, useMemo, useState } from 'react'

const OFFICE_VIEWER_URL = 'https://view.officeapps.live.com/op/embed.aspx'

type OfficeSessionEntry = {
  isWarm: boolean
  lastOpenedAt: number | null
}

const officePreviewSessions = new Map<string, OfficeSessionEntry>()

function getOrCreateSession(url: string): OfficeSessionEntry {
  const existing = officePreviewSessions.get(url)
  if (existing) return existing

  const entry: OfficeSessionEntry = {
    isWarm: false,
    lastOpenedAt: null,
  }
  officePreviewSessions.set(url, entry)
  return entry
}

export function useOfficePreviewSession(url: string | undefined) {
  const [version, setVersion] = useState(0)

  const viewerSrc = useMemo(() => {
    if (!url) return null
    return `${OFFICE_VIEWER_URL}?src=${encodeURIComponent(url)}`
  }, [url])

  const session = url ? getOrCreateSession(url) : null

  const warmSession = useCallback(() => {
    if (!url) return
    const current = getOrCreateSession(url)
    if (current.isWarm) return

    current.isWarm = true
    setVersion((value) => value + 1)
  }, [url])

  const markOpened = useCallback(() => {
    if (!url) return
    const current = getOrCreateSession(url)
    current.isWarm = true
    current.lastOpenedAt = Date.now()
    setVersion((value) => value + 1)
  }, [url])

  void version

  return {
    viewerSrc,
    isWarm: session?.isWarm ?? false,
    lastOpenedAt: session?.lastOpenedAt ?? null,
    warmSession,
    markOpened,
  }
}
