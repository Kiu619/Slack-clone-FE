'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getMessageByIdApi } from '@/apis'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'

/**
 * Đọc `?openThreadParent=<messageId>`, fetch parent message, mở thread panel, gỡ query khỏi URL.
 */
export function useOpenThreadFromSearchParams(enabled: boolean) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const openThread = useThreadPanelStore((s) => s.open)

  useEffect(() => {
    if (!enabled) return
    const parentId = searchParams.get('openThreadParent')
    if (!parentId) return

    let cancelled = false
    void (async () => {
      try {
        const msg = await getMessageByIdApi(parentId)
        if (cancelled) return
        openThread(msg, null)
      } catch {
        /* tin không tồn tại hoặc 403 */
      }
      if (cancelled) return
      const next = new URLSearchParams(searchParams.toString())
      next.delete('openThreadParent')
      const q = next.toString()
      router.replace(q ? `${pathname}?${q}` : pathname)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, searchParams, pathname, router, openThread])
}
