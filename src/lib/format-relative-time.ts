import { formatDistance, formatDistanceStrict } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import type { Language } from "@/stores/useLanguageRegionStore";

const localeMap = { en: enUS, vi } as const;

type Options = { addSuffix?: boolean };

/**
 * i18n wrapper around date-fns `formatDistanceStrict`.
 * Use this when the existing call site was `formatDistanceToNowStrict`.
 *
 * Pass the user's current `language` (from `useLanguageRegionStore`) so the
 * output matches the active locale (e.g. "9 days ago" / "9 ngày trước").
 */
export function formatRelativeTime(
  date: Date | number | string,
  baseDate: Date | number = Date.now(),
  opts: Options = {},
  language: Language = "en",
): string {
  const locale = localeMap[language] ?? enUS;
  return formatDistanceStrict(date, baseDate, { ...opts, locale });
}

/**
 * i18n wrapper around date-fns `formatDistance` (non-strict variant).
 * Use this when the existing call site was `formatDistanceToNow` — it allows
 * qualifiers like "almost", "over", "about" which date-fns translates per
 * locale.
 */
export function formatRelativeTimeLoose(
  date: Date | number | string,
  baseDate: Date | number = Date.now(),
  opts: Options = {},
  language: Language = "en",
): string {
  const locale = localeMap[language] ?? enUS;
  return formatDistance(date, baseDate, { ...opts, locale });
}
