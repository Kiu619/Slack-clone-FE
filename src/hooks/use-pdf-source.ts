'use client'

import { useEffect, useState } from 'react'
import { useFileCache } from '@/hooks/use-file-cache'

const PDF_SOURCE_GRACE_PERIOD_MS = 30_000

type PdfSourceEntry = {
  buffer: ArrayBuffer
  objectUrl: string
  refCount: number
  disposeTimer: ReturnType<typeof setTimeout> | null
}

const pdfSourceRegistry = new Map<string, PdfSourceEntry>()

function createPdfObjectUrl(buffer: ArrayBuffer): string {
  const blob = new Blob([buffer], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

function acquirePdfSource(url: string, buffer: ArrayBuffer): string {
  const existing = pdfSourceRegistry.get(url)

  if (existing) {
    if (existing.disposeTimer) {
      clearTimeout(existing.disposeTimer)
      existing.disposeTimer = null
    }

    if (existing.buffer !== buffer) {
      URL.revokeObjectURL(existing.objectUrl)
      existing.buffer = buffer
      existing.objectUrl = createPdfObjectUrl(buffer)
    }

    existing.refCount += 1
    return existing.objectUrl
  }

  const entry: PdfSourceEntry = {
    buffer,
    objectUrl: createPdfObjectUrl(buffer),
    refCount: 1,
    disposeTimer: null,
  }

  pdfSourceRegistry.set(url, entry)
  return entry.objectUrl
}

function releasePdfSource(url: string) {
  const entry = pdfSourceRegistry.get(url)
  if (!entry) return

  entry.refCount = Math.max(0, entry.refCount - 1)
  if (entry.refCount > 0 || entry.disposeTimer) return

  entry.disposeTimer = setTimeout(() => {
    const current = pdfSourceRegistry.get(url)
    if (!current || current.refCount > 0) return

    URL.revokeObjectURL(current.objectUrl)
    pdfSourceRegistry.delete(url)
  }, PDF_SOURCE_GRACE_PERIOD_MS)
}

export function usePdfSource(url: string | undefined, enabled = true) {
  const { data, isPending, isError, error } = useFileCache(url, enabled)
  const [pdfSourceUrl, setPdfSourceUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url || !data || !enabled) return

    const sourceUrl = acquirePdfSource(url, data)
    // Đồng bộ object URL từ source manager bên ngoài React vào state cục bộ của hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPdfSourceUrl(sourceUrl)

    return () => {
      releasePdfSource(url)
    }
  }, [data, enabled, url])

  return {
    pdfSourceUrl: url && data && enabled ? pdfSourceUrl : null,
    isPending,
    isError,
    error,
  }
}
