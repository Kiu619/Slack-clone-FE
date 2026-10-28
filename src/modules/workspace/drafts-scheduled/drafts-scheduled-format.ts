import { formatTimestamp } from "@/helpers/format-time-stamp"
import type {
  Language,
  TimeFormat,
} from "@/stores/useLanguageRegionStore"

export type FormatDraftsScheduledTimeOptions = {
  language: Language
  timeFormat: TimeFormat
}

export const formatDraftsScheduledTime = (
  isoOrTs: string | number,
  opts: FormatDraftsScheduledTimeOptions,
): string => {
  try {
    const dateStr =
      typeof isoOrTs === "number" ? new Date(isoOrTs).toISOString() : isoOrTs
    return formatTimestamp(dateStr, {
      timeFormat: opts.timeFormat,
      language: opts.language,
    })
  } catch {
    return ""
  }
}
