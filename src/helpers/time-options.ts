import type { TimeFormat } from "@/stores/useLanguageRegionStore"

export interface TimeOption {
  value: string // "HH:mm" canonical 24h
  label: string // formatted per timeFormat
  hour: number // 0..23
  minute: number // 0 | 15 | 30 | 45
}

const pad2 = (n: number): string => n.toString().padStart(2, "0")

const formatLabel = (value: string, timeFormat: TimeFormat): string => {
  const [hStr = "0", mStr = "0"] = value.split(":")
  const h = Number(hStr)
  const m = Number(mStr)
  if (timeFormat === "24h") {
    return `${pad2(h)}:${pad2(m)}`
  }
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad2(m)} ${ampm}`
}

export function buildTimeOptions(timeFormat: TimeFormat): TimeOption[] {
  const options: TimeOption[] = []
  for (let i = 0; i < 96; i++) {
    const hour = Math.floor(i / 4)
    const minute = (i % 4) * 15
    const value = `${pad2(hour)}:${pad2(minute)}`
    options.push({
      value,
      label: formatLabel(value, timeFormat),
      hour,
      minute,
    })
  }
  return options
}
