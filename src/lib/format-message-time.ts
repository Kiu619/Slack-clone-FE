import { format, isToday, isYesterday } from "date-fns"
import type { useTranslations } from "next-intl"
import type { Language, TimeFormat } from "@/stores/useLanguageRegionStore"
import { formatTime } from "@/lib/format-time"

type Translator = ReturnType<typeof useTranslations>

export type FormatMessageTimeOptions = {
  t: Translator
  commonT: Translator
  language: Language
  timeFormat: TimeFormat
}

export function formatMessageTime(
  isoString: string,
  { t, commonT, language, timeFormat }: FormatMessageTimeOptions
): string {
  const date = new Date(isoString)
  const timeStr = formatTime(date, timeFormat)

  if (isToday(date)) {
    return `${t("todayAt")} ${timeStr}`
  }
  if (isYesterday(date)) {
    return `${t("yesterdayAt")} ${timeStr}`
  }

  const isCurrentYear = date.getFullYear() === new Date().getFullYear()
  const day = String(date.getDate())
  const monthIndex = date.getMonth()
  const months = commonT.raw("monthShort") as Record<string, string>
  const month = months[String(monthIndex)] ?? ""
  const year = String(date.getFullYear())
  const isDayFirst = language === "vi"
  const monthDay = isDayFirst ? `${day} ${month}` : `${month} ${day}`

  if (language === "vi") {
    return isCurrentYear
      ? `${monthDay} lúc ${timeStr}`
      : `${monthDay} ${year} lúc ${timeStr}`
  }

  if (isCurrentYear) {
    return `${monthDay} at ${timeStr}`
  }

  const numericDate = isDayFirst
    ? `${day}/${monthIndex + 1}/${year}`
    : `${monthIndex + 1}/${day}/${year}`
  return `${numericDate} at ${timeStr}`
}
