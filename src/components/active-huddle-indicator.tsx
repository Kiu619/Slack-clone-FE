'use client'

import { leaveHuddleApi } from '@/apis'
import {
  openHuddlePreviewWindow,
  requestHuddlePreviewLeave,
} from '@/lib/open-huddle-preview-window'
import { useCurrentHuddleStore } from '@/stores/useCurrentHuddleStore'
import { useSocket, leaveHuddleSocket } from '@/hooks/use-socket'
import { huddleKeys } from '@/lib/query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { RiHeadphoneLine } from 'react-icons/ri'
import { useState } from 'react'

export function ActiveHuddleIndicator() {
  const { currentHuddle, clearCurrentHuddle } = useCurrentHuddleStore()
  const [isLeaving, setIsLeaving] = useState(false)
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  if (!currentHuddle) return null

  const { target, label, topic } = currentHuddle

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLeaving) return
    setIsLeaving(true)

    // Optimistic: clear UI immediately
    requestHuddlePreviewLeave(target)
    clearCurrentHuddle()

    // Fire-and-forget
    if (socket?.connected) {
      void leaveHuddleSocket(target, socket).catch(() => {})
    } else {
      void leaveHuddleApi(target).catch(() => {})
    }

    // Invalidate queries to update all indicators immediately
    queryClient.invalidateQueries({
      queryKey: huddleKeys.workspaceHuddles(target.workspaceId, undefined)
    })

    // UI already updated, reset loading state after 1 frame
    setTimeout(() => setIsLeaving(false), 100)
  }

  const handleOpen = () => {
    openHuddlePreviewWindow({
      ...target,
      label,
      mode: 'join',
    })
  }

  const title = topic
    ? `${topic} in`
    : target.entityType === 'channel'
      ? 'Huddle in'
      : 'Huddle with'

  const subtitle = target.entityType === 'channel' ? `#${label}` : label

  return (
    <div
      className=" flex items-center justify-between border-t border-[#2ea55f] bg-[#1f8f4a] px-4 py-2"
    >
      {/* Clickable area - opens huddle preview */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 text-white hover:underline"
      >
        <RiHeadphoneLine size={18} />
        <span className="text-sm font-medium">
          {title} {subtitle}
        </span>
      </button>

      {/* Leave button */}
      <button
        type="button"
        onClick={handleLeave}
        disabled={isLeaving}
        className={cn(
          'rounded bg-[#248a4b] px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-[#155333]',
          isLeaving && 'pointer-events-none opacity-50',
        )}
      >
        Leave
      </button>
    </div>
  )
}
