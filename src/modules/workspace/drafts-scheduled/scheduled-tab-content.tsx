'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Typography from '@/components/ui/typography'
import { ICON_TRANSITION, TOOLBAR_ITEM_STYLE } from '@/constants/styles'
import { previewPlainFromDraftHtml } from '@/lib/message-drafts'
import type { ScheduledMessageRow } from '@/lib/scheduled-messages-api'
import type { Channel, DirectMessageConversation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LuPencil, LuSend } from 'react-icons/lu'
import { MdMoreVert, MdOutlineScheduleSend } from 'react-icons/md'
import { formatDraftsScheduledTime } from './drafts-scheduled-format'
import { resolveScheduledRowTitle } from './drafts-scheduled-resolve'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type ScheduledTabContentProps = {
  rows: ScheduledMessageRow[]
  channels: Channel[]
  conversations: DirectMessageConversation[]
  userId?: string
  isCancelling: boolean
  onEditScheduled: (row: ScheduledMessageRow) => void
  onReschedule: (row: ScheduledMessageRow) => void
  onSendNow: (row: ScheduledMessageRow) => void | Promise<void>
  onCancelToDraft: (row: ScheduledMessageRow) => void | Promise<void>
  onDeleteScheduled: (row: ScheduledMessageRow) => void
  onNewMessage: () => void
}

export const ScheduledTabContent = ({
  rows,
  channels,
  conversations,
  userId,
  isCancelling,
  onEditScheduled,
  onReschedule,
  onSendNow,
  onCancelToDraft,
  onDeleteScheduled,
  onNewMessage,
}: ScheduledTabContentProps) => {
  const ctx = { channels, conversations, userId }
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <div className="flex min-h-full max-w-100 flex-col items-center justify-center gap-2 mx-auto text-center">
        <Typography
          text="Write now, send later"
          variant="h5"
          className="font-semibold"
        />
        <Typography
          text="Schedule messages to be sent at a later time, or another day altogether. They’ll wait here until they’re delivered."
          variant="p"
          className="text-[14px] font-medium"
        />
        <Button onClick={onNewMessage} variant="outline">
          <Typography
            text="New message "
            variant="p"
            className="text-[13px] font-semibold"
          />
        </Button>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="group relative rounded-lg border border-[#797c814d] bg-[#f8f8f8] px-4 py-3 pr-14 dark:bg-[#222529]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
                  {resolveScheduledRowTitle(row, ctx)}
                </span>
                <span className="shrink-0 text-xs text-[#616061] dark:text-[#ababad]">
                  Send at{' '}
                  {formatDraftsScheduledTime(
                    new Date(row.scheduledAt).getTime(),
                  )}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-[#616061] dark:text-[#ababad]">
                {previewPlainFromDraftHtml(row.content, 160)}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-[#797c814d] bg-white px-0.5 py-0.5 opacity-0 shadow-md transition-opacity duration-150 dark:bg-[#1A1D21]',
              'group-hover:pointer-events-auto group-hover:opacity-100',
              'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
              openMenuId === row.id && 'pointer-events-auto opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditScheduled(row)
                  }}
                >
                  <LuPencil size={18} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Edit message</p>
              </TooltipContent>
            </Tooltip> */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReschedule(row)
                  }}
                >
                  <MdOutlineScheduleSend
                    size={18}
                    className={ICON_TRANSITION}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Reschedule message</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onSendNow(row)
                  }}
                >
                  <LuSend size={20} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Send message</p>
              </TooltipContent>
            </Tooltip>

            <Popover
              open={openMenuId === row.id}
              onOpenChange={(o) => setOpenMenuId(o ? row.id : null)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={TOOLBAR_ITEM_STYLE}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MdMoreVert size={20} className={ICON_TRANSITION} />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">More actions</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="left"
                align="start"
                sideOffset={8}
                className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                withOverlay={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="py-2">
                  <div className="flex flex-col space-y-1">
                    <Button
                      type="button"
                      variant="submenu"
                      onClick={() => {
                        setOpenMenuId(null)
                        void onCancelToDraft(row)
                      }}
                    >
                      <Typography
                        variant="p"
                        text="Cancel schedule and save to draft"
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isCancelling}
                      className="justify-start rounded-none px-5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-700 hover:text-white dark:text-red-400"
                      onClick={() => {
                        setOpenMenuId(null)
                        onDeleteScheduled(row)
                      }}
                    >
                      Delete message
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </li>
      ))}
    </ul>
  )
}
