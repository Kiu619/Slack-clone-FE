'use client'

import { useState } from 'react'
import type { Channel, DirectMessageConversation } from '@/lib/types'
import type { MessageDraftSummary } from '@/lib/message-drafts'
import { previewPlainFromDraftHtml } from '@/lib/message-drafts'
import Typography from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { formatDraftsScheduledTime } from './drafts-scheduled-format'
import { resolveDraftSummaryTitle } from './drafts-scheduled-resolve'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ICON_TRANSITION, TOOLBAR_ITEM_STYLE } from '@/constants/styles'
import { MdOutlineScheduleSend } from 'react-icons/md'
import { LuPencil, LuSend, LuTrash2 } from 'react-icons/lu'

type DraftsTabContentProps = {
  summaries: MessageDraftSummary[]
  channels: Channel[]
  conversations: DirectMessageConversation[]
  userId?: string
  onOpenDraft: (row: MessageDraftSummary) => void
  onDeleteDraft: (row: MessageDraftSummary) => Promise<void>
  onScheduleDraft: (row: MessageDraftSummary) => void
  onSendDraft: (row: MessageDraftSummary) => void | Promise<void>
  onNewMessage: () => void
  t: (key: string) => string
}

export const DraftsTabContent = ({
  summaries,
  channels,
  conversations,
  userId,
  onOpenDraft,
  onDeleteDraft,
  onScheduleDraft,
  onSendDraft,
  onNewMessage,
  t,
}: DraftsTabContentProps) => {
  const ctx = { channels, conversations, userId }
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  if (summaries.length === 0) {
    return (
      <div className="flex min-h-full max-w-100 flex-col items-center justify-center gap-2 mx-auto text-center">
        <Typography
          text={t('draftsEmptyState.title')}
          variant="h5"
          className="font-semibold"
        />
        <Typography
          text={t('draftsEmptyState.description')}
          variant="p"
          className="text-[14px] font-medium"
        />
        <Button onClick={onNewMessage} variant="outline">
          <Typography
            text={t('draftsEmptyState.newMessage')}
            variant="p"
            className="text-[13px] font-semibold"
          />
        </Button>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {summaries.map((row) => (
        <li key={row.contextKey} className="group relative">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenDraft(row)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenDraft(row)
              }
            }}
            className="w-full cursor-pointer rounded-lg border border-[#797c814d] bg-[#f8f8f8] px-4 py-3 pr-14 text-left transition-colors hover:bg-[#ececec] dark:bg-[#222529] dark:hover:bg-[#2a2d31]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
                {resolveDraftSummaryTitle(row, ctx)}
              </span>
              <span className="shrink-0 text-xs text-[#616061] dark:text-[#ababad]">
                {formatDraftsScheduledTime(row.updatedAt)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[#616061] dark:text-[#ababad]">
              {previewPlainFromDraftHtml(row.html, 160)}
            </p>
          </div>

          <div
            className={cn(
              'pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-[#797c814d] bg-white px-0.5 py-0.5 opacity-0 shadow-md transition-opacity duration-150 dark:bg-[#1A1D21]',
              'group-hover:pointer-events-auto group-hover:opacity-100',
              'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={deletingKey === row.contextKey}
                  className={cn(
                    TOOLBAR_ITEM_STYLE,
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                  onClick={async (e) => {
                    e.stopPropagation()
                    setDeletingKey(row.contextKey)
                    try {
                      await onDeleteDraft(row)
                    } finally {
                      setDeletingKey(null)
                    }
                  }}
                >
                  <LuTrash2 size={18} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t('tooltips.deleteDraft')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDraft(row)
                  }}
                >
                  <LuPencil size={18} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t('tooltips.editDraft')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    onScheduleDraft(row)
                  }}
                >
                  <MdOutlineScheduleSend size={18} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t('tooltips.scheduleMessage')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onSendDraft(row)
                  }}
                >
                  <LuSend size={20} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t('tooltips.sendMessage')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </li>
      ))}
    </ul>
  )
}
