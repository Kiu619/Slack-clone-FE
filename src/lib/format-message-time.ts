import { format, isToday, isYesterday } from "date-fns"
import type { useTranslations } from "next-intl"
import type { DateFormat, Language, TimeFormat } from "@/stores/useLanguageRegionStore"

type Translator = ReturnType<typeof useTranslations>

export type FormatMessageTimeOptions = {
  t: Translator
  commonT: Translator
  language: Language
  timeFormat: TimeFormat
  dateFormat: DateFormat
}

export function formatMessageTime(
  isoString: string,
  { t, commonT, language, timeFormat, dateFormat }: FormatMessageTimeOptions
): string {
  const date = new Date(isoString)
  const timeStr =
    timeFormat === "24h" ? format(date, "HH:mm") : format(date, "h:mm a")

  if (isToday(date)) {
    return `${t("todayAt")} ${timeStr}`
  }
  if (isYesterday(date)) {
    return `${t("yesterdayAt")} ${timeStr}`
  }

  const isCurrentYear = date.getFullYear() === new Date().getFullYear()
  const day = format(date, "d")
  const monthIndex = date.getMonth()
  const months = commonT.raw("monthShort") as Record<string, string>
  const month = months[String(monthIndex)] ?? ""
  const year = String(date.getFullYear())
  const isDayFirst = dateFormat === "vi_VN"
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