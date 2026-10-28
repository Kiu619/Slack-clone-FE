'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { useAppTranslation } from '@/hooks/use-translation'
import { computeScheduledSendAckI18n } from '@/lib/format-scheduled-send-ack'
import { cn } from '@/lib/utils'

type ScheduledSendAckBannerProps = {
  workspaceId: string
  scheduledAtIso: string
  /** Tổng tin pending sau khi lên lịch; ≥2 thì copy dạng số nhiều. */
  pendingScheduledCount: number
  workspaceTimeZone?: string | null
  className?: string
}

export const ScheduledSendAckBanner = ({
  workspaceId,
  scheduledAtIso,
  pendingScheduledCount,
  workspaceTimeZone,
  className,
}: ScheduledSendAckBannerProps) => {
  const t = useAppTranslation('draftsScheduled')
  const usePluralCopy = pendingScheduledCount >= 2

  // Use the same i18n hook for the plural label so it localizes too.
  const sentence = usePluralCopy
    ? t('ackSentence.plural', { count: pendingScheduledCount })
    : (() => {
        const i18n = computeScheduledSendAckI18n(scheduledAtIso, workspaceTimeZone)
        return i18n ? t(i18n.key, i18n.params) : ''
      })()

  const href = `/workspace/${workspaceId}/drafts?tab=scheduled`

  return (
    <div
      className={cn(
        'mb-2 flex gap-2 rounded-md border border-[#797c814d] bg-[#f8f8f8] px-3 py-2.5 dark:border-[#46474a] dark:bg-[#222529]',
        className,
      )}
      role="status"
    >
      <CalendarClock
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#616061] dark:text-[#ababad]"
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-[#1d1c1d] dark:text-[#e8e8e8]">
        <p>{sentence}</p>
        <Link
          href={href}
          className="mt-0.5 inline-block font-medium text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
        >
          {t('ackSentence.seeAll')}
        </Link>
      </div>
    </div>
  )
}
