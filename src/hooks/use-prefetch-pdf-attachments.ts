'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { attachmentFileKeys } from '@/lib/query-keys'
import { isPdfFile } from '@/components/attachment-previews/file-utils'
import type { MessagesPage } from '@/lib/types'

/** Số tối đa PDF prefetch mỗi lần — tránh quá tải */
const MAX_PREFETCH = 10

function extractPdfUrls(pages: MessagesPage[]): string[] {
  const urls = new Set<string>()
  for (const page of pages) {
    for (const msg of page.messages) {
      for (const att of msg.attachments ?? []) {
        if (isPdfFile(att.name, att.mimeType) && att.url) {
          urls.add(att.url)
        }
      }
    }
  }
  return Array.from(urls).slice(0, MAX_PREFETCH)
}

/**
 * Prefetch PDF attachments khi messages đã load.
 * Gọi trong MessageList — khi data.pages thay đổi, prefetch PDF URLs trong background.
 */
export function usePrefetchPdfAttachments(pages: MessagesPage[] | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!pages?.length) return

    const urls = extractPdfUrls(pages)

    for (const url of urls) {
      void queryClient.prefetchQuery({
        queryKey: attachmentFileKeys.blob(url),
        queryFn: async () => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
          return res.arrayBuffer()
        },
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
      })
    }
  }, [queryClient, pages])
}
