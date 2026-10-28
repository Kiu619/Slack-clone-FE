import { format } from "date-fns";
import type { TimeFormat } from "@/stores/useLanguageRegionStore";

/**
 * Format ONLY the time portion of a date according to the user's chosen
 * `timeFormat` (12h / 24h). Independent of language — both EN and VI use the
 * same time notation.
 *
 * Use `formatDate` to render the date portion.
 */
export function formatTime(
  input: Date | string | number,
  timeFormat: TimeFormat,
): string {
  const d = input instanceof Date ? input : new Date(input);
  return timeFormat === "24h" ? format(d, "HH:mm") : format(d, "h:mm a");
}
