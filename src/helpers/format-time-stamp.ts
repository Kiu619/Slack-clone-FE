import { isToday, isYesterday, format } from "date-fns"
import type { DateFormat, Language, TimeFormat } from "@/stores/useLanguageRegionStore"

const DATE_FORMAT_PATTERNS: Record<DateFormat, string> = {
  en_US: "MM/dd/yyyy",
  vi_VN: "dd/MM/yyyy",
}

const TIME_FORMAT_PATTERNS: Record<TimeFormat, string> = {
  "12h": "hh:mm a",
  "24h": "HH:mm",
}

const YESTERDAY_STRINGS: Record<Language, string> = {
  en: "Yesterday at",
  vi: "Hôm qua lúc",
}

export function formatTimestamp(
  dateStr: string,
  opts: { dateFormat: DateFormat; timeFormat: TimeFormat; language: Language },
): string {
  const date = new Date(dateStr)
  const timeStr = format(date, TIME_FORMAT_PATTERNS[opts.timeFormat])
  if (isToday(date)) return timeStr
  if (isYesterday(date)) return `${YESTERDAY_STRINGS[opts.language]} ${timeStr}`
  return `${format(date, DATE_FORMAT_PATTERNS[opts.dateFormat])} ${timeStr}`
}
