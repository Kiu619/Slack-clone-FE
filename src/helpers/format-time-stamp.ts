import { isToday, isYesterday, format } from "date-fns"

export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return format(date, 'dd/MM/yyyy HH:mm')
}
