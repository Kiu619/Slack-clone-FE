/**
 * Timezone options và helpers cho profile.
 * Format value: "(UTC±HH:MM)"
 */

export const TIMEZONE_OPTIONS = [
  { label: "(UTC-11:00) Midway Island, American Samoa", value: "(UTC-11:00)" },
  { label: "(UTC-10:00) Hawaii", value: "(UTC-10:00)" },
  { label: "(UTC-09:00) Alaska", value: "(UTC-09:00)" },
  { label: "(UTC-08:00) Pacific Time (US & Canada)", value: "(UTC-08:00)" },
  { label: "(UTC-07:00) Mountain Time (US & Canada)", value: "(UTC-07:00)" },
  { label: "(UTC-06:00) Central Time (US & Canada)", value: "(UTC-06:00)" },
  { label: "(UTC-05:00) Eastern Time (US & Canada)", value: "(UTC-05:00)" },
  { label: "(UTC-04:00) Atlantic Time (Canada)", value: "(UTC-04:00)" },
  { label: "(UTC-03:00) Argentina, Brazil", value: "(UTC-03:00)" },
  { label: "(UTC-02:00) South Georgia/South Sandwich Islands", value: "(UTC-02:00)" },
  { label: "(UTC-01:00) Azores", value: "(UTC-01:00)" },
  { label: "(UTC+00:00) London, Lisbon, Dublin", value: "(UTC+00:00)" },
  { label: "(UTC+01:00) Amsterdam, Berlin, Madrid", value: "(UTC+01:00)" },
  { label: "(UTC+02:00) Athens, Istanbul, Cairo", value: "(UTC+02:00)" },
  { label: "(UTC+03:00) Moscow, Nairobi", value: "(UTC+03:00)" },
  { label: "(UTC+04:00) Dubai, Abu Dhabi", value: "(UTC+04:00)" },
  { label: "(UTC+05:00) Karachi, Tashkent", value: "(UTC+05:00)" },
  { label: "(UTC+06:00) Dhaka, Novosibirsk", value: "(UTC+06:00)" },
  { label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", value: "(UTC+07:00)" },
  { label: "(UTC+08:00) Beijing, Singapore, Hong Kong", value: "(UTC+08:00)" },
  { label: "(UTC+09:00) Tokyo, Seoul", value: "(UTC+09:00)" },
  { label: "(UTC+10:00) Sydney, Melbourne", value: "(UTC+10:00)" },
  { label: "(UTC+11:00) Solomon Islands, New Caledonia", value: "(UTC+11:00)" },
  { label: "(UTC+12:00) Auckland, Fiji", value: "(UTC+12:00)" },
  { label: "(UTC+13:00) Samoa, Tonga", value: "(UTC+13:00)" },
  { label: "(UTC+14:00) Kiribati", value: "(UTC+14:00)" },
] 

export const TIMEZONE_VALUES = TIMEZONE_OPTIONS.map((o) => o.value)

/**
 * Lấy giá trị timezone từ browser, map sang giá trị gần nhất trong TIMEZONE_OPTIONS.
 * Ví dụ: Việt Nam UTC+7 => "(UTC+07:00)", Ấn Độ UTC+5:30 => "(UTC+06:00)" (làm tròn)
 */
export function getBrowserTimeZoneValue(): string {
  const offsetMinutes = -new Date().getTimezoneOffset()
  const offsetHours = Math.round(offsetMinutes / 60)
  const clamped = Math.max(-11, Math.min(14, offsetHours))
  const sign = clamped >= 0 ? "+" : "-"
  const h = Math.abs(clamped).toString().padStart(2, "0")
  const value = `(UTC${sign}${h}:00)`
  return (TIMEZONE_VALUES as readonly string[]).includes(value) ? value : "(UTC+00:00)"
}

/**
 * Chuyển value "(UTC+07:00)" sang IANA timezone để dùng với Intl (ví dụ: Etc/GMT-7).
 * Lưu ý: Etc/GMT dùng sign ngược — Etc/GMT-7 = UTC+7, Etc/GMT+5 = UTC-5.
 */
export function timeZoneValueToIana(value: string): string {
  const match = value.match(/\(UTC([+-])(\d{2}):(\d{2})\)/)
  if (!match) return "UTC"
  const sign = match[1]
  const hours = parseInt(match[2], 10)
  const mins = parseInt(match[3], 10)
  const totalHours = sign === "+" ? hours + mins / 60 : -(hours + mins / 60)
  const etcSign = totalHours >= 0 ? "-" : "+"
  const absHours = Math.abs(Math.floor(totalHours))
  return `Etc/GMT${etcSign}${absHours}`
}

/**
 * Hiển thị giờ local theo timezone value "(UTC+07:00)".
 * Nếu value rỗng, dùng timezone của browser.
 */
export function formatLocalTimeInTimeZone(value: string | null | undefined): string {
  const now = new Date()
  const tzLabel = value || getBrowserTimeZoneValue()
  const ianaTz = value ? timeZoneValueToIana(value) : Intl.DateTimeFormat().resolvedOptions().timeZone
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ianaTz,
  })
  return `${timeStr} ${tzLabel} (local time)`
}
