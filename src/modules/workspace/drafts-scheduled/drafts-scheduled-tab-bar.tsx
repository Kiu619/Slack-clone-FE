'use client'

import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/useThemeStore'
import Typography from '@/components/ui/typography'

export type DraftsScheduledTabId = 'drafts' | 'scheduled'

type DraftsScheduledTabBarProps = {
  tab: DraftsScheduledTabId
  onTabChange: (tab: DraftsScheduledTabId) => void
  draftsCount: number
  scheduledCount: number
}

export const DraftsScheduledTabBar = ({
  tab,
  onTabChange,
  draftsCount,
  scheduledCount,
}: DraftsScheduledTabBarProps) => {
  const theme = useThemeStore((s) => s.theme)

  const tabButtonClass = (active: boolean) =>
    cn(
      'flex items-center gap-x-1 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md',
      active
        ? 'border-current text-current'
        : 'border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal',
    )

  const activeStyle = (active: boolean) =>
    active
      ? {
          borderColor: theme.selectedItems,
          borderBottomWidth: 3,
          color: theme.selectedItems,
        }
      : {}

  return (
    <div className="flex gap-1 rounded-lg px-4 mt-2">
      <button
        type="button"
        onClick={() => onTabChange('drafts')}
        className={tabButtonClass(tab === 'drafts')}
        style={activeStyle(tab === 'drafts')}
      >
        <Typography text="Drafts" variant="p" className="text-[13px] font-semibold" />
        {draftsCount > 0 ? (
          <span className="text-[13px] font-semibold opacity-70">{draftsCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onTabChange('scheduled')}
        className={tabButtonClass(tab === 'scheduled')}
        style={activeStyle(tab === 'scheduled')}
      >
        <Typography text="Scheduled" variant="p" className="text-[13px] font-semibold" />
        {scheduledCount > 0 ? (
          <span className="text-[13px] font-semibold opacity-70">{scheduledCount}</span>
        ) : null}
      </button>
    </div>
  )
}
