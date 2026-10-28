import { isToday, isYesterday } from "date-fns"
import type { Language, TimeFormat } from "@/stores/useLanguageRegionStore"
import { formatDate } from "@/lib/format-date"
import { formatTime } from "@/lib/format-time"

const YESTERDAY_STRINGS: Record<Language, string> = {
  en: "Yesterday at",
  vi: "Hôm qua lúc",
}

export function formatTimestamp(
  dateStr: string,
  opts: { timeFormat: TimeFormat; language: Language },
): string {
  const date = new Date(dateStr)
  const timeStr = formatTime(date, opts.timeFormat)
  if (isToday(date)) return timeStr
  if (isYesterday(date)) return `${YESTERDAY_STRINGS[opts.language]} ${timeStr}`
  return `${formatDate(date, opts.language)} ${timeStr}`
}
