import { useMemo, useState } from 'react'
import { CustomDialog, CustomDialogBody, CustomDialogHeader, CustomDialogTitle } from '../custom-dialog'
import { Calendar } from '../ui/calendar'
import { startOfDay } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import type { Matcher } from 'react-day-picker'
import { useDialogs, useLanguage } from '@/hooks/use-translation'
import type { Language } from '@/stores/useLanguageRegionStore'

const LOCALE_MAP: Record<Language, typeof enUS> = {
  en: enUS,
  vi: vi,
}

export default function JumpToSpecificDateDialog({
  open,
  onOpenChange,
  onJump,
  targetCreatedAt
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onJump: (date: Date) => void,
  targetCreatedAt?: string
}) {
  const t = useDialogs();
  const language = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const dateLocale = LOCALE_MAP[language] || enUS

  const disabledDays = useMemo<Matcher[]>(
    () => [
      { after: new Date() },
      ...(targetCreatedAt
        ? [{ before: startOfDay(new Date(targetCreatedAt)) } satisfies Matcher]
        : []),
    ],
    [targetCreatedAt],
  )

  const handleDateSelect = async (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      await Promise.resolve(onJump(date))
      onOpenChange(false)
    }
  }

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={() => onOpenChange(false)}>
        <CustomDialogTitle>{t('jumpToDate.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="p-0 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={disabledDays}
          autoFocus
          locale={dateLocale}
          className="rounded-md border-none"
        />
      </CustomDialogBody>
    </CustomDialog>
  )
}
