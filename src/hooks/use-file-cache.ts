'use client'

import { useQuery } from '@tanstack/react-query'
import { attachmentFileKeys } from '@/lib/query-keys'

/** Cache 24h — match backend ResponseCacheControl */
const STALE_TIME = 24 * 60 * 60 * 1000

/**
 * useFileCache — Fetch file theo URL và cache ArrayBuffer dùng React Query.
 * Dùng cho PdfPreview để tránh tải lại PDF khi đóng/mở lại modal.
 *
 * @param url - URL file (presigned S3, Cloudinary, v.v.)
 * @param enabled - Có fetch không (mặc định true khi có url)
 */
export function useFileCache(url: string | undefined, enabled = true) {
  return useQuery({
    queryKey: attachmentFileKeys.blob(url ?? ''),
    queryFn: async () => {
      if (!url) throw new Error('URL required')
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      return res.arrayBuffer()
    },
    enabled: !!url && enabled,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
  })
}
