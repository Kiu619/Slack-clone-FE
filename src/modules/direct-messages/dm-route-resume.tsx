'use client'

import { useConversations } from '@/hooks/use-conversations'
import { getLastDmConversationId } from '@/lib/last-dm-storage'
import { useMainPanelStore } from '@/stores/useMainPanelStore'
import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Trên `/dms`: sau khi có danh sách conversations, mở lại DM đã lưu trong localStorage
 * (ghi khi user `setView({ type: 'dm' })`). Xóa bản ghi khi user bấm X trên header DM.
 */
export const DmRouteResume = () => {
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = params.workspaceId
  const setView = useMainPanelStore((s) => s.setView)
  const { data: conversations } = useConversations(workspaceId ?? '')
  const didLocalRestoreRef = useRef(false)

  useEffect(() => {
    didLocalRestoreRef.current = false
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    if (conversations === undefined) return
    if (didLocalRestoreRef.current) return
    didLocalRestoreRef.current = true

    const saved = getLastDmConversationId(workspaceId)
    if (saved && conversations.some((c) => c.id === saved)) {
      setView({ type: 'dm', conversationId: saved })
    }
  }, [workspaceId, conversations, setView])

  return null
}
