"use client";

import { useLanguage, useTimeFormat } from "./use-translation";
import { formatDate } from "@/lib/format-date";
import { formatTime } from "@/lib/format-time";

/**
 * Hook that returns ready-to-use date/time formatters bound to the current
 * user's `language` (for date) and `timeFormat` (for time) from the store.
 *
 * Usage:
 *   const { formatDate, formatTime } = useLocaleFormatter();
 *   formatDate(someDate);            // "MM/dd/yyyy" or "dd/MM/yyyy"
 *   formatTime(someDate);            // "h:mm a" or "HH:mm"
 *   `${formatDate(d)} ${formatTime(d)}` // full timestamp
 *
 * No need to pass `language` / `timeFormat` to call sites — keeps callers clean.
 */
export function useLocaleFormatter() {
  const language = useLanguage();
  const timeFormat = useTimeFormat();

  return {
    formatDate: (input: Date | string | number) =>
      formatDate(input, language),
    formatTime: (input: Date | string | number) =>
      formatTime(input, timeFormat),
  };
}
