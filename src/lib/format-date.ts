import { format } from "date-fns";
import type { Language } from "@/stores/useLanguageRegionStore";

/**
 * i18n wrapper around date-fns `format` that returns a numeric date
 * in the user's current language:
 *   - `en` → `MM/dd/yyyy`
 *   - `vi` → `dd/MM/yyyy`
 *
 * Time component is intentionally NOT included — see `formatTime` for that.
 */
export function formatDate(
  input: Date | string | number,
  language: Language,
): string {
  const d = input instanceof Date ? input : new Date(input);
  return language === "vi"
    ? format(d, "dd/MM/yyyy")
    : format(d, "MM/dd/yyyy");
}
