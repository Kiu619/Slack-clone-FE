import type { SavedItem } from "@/lib/types";

/**
 * Check if a SavedItem is overdue (reminder time has passed).
 * Uses `Date.now()` for real-time check.
 */
export function isSavedItemOverdue(item: SavedItem): boolean {
  if (item.status !== "in_progress" || !item.remindAt) return false;
  const remindAt = new Date(item.remindAt).getTime();
  return !Number.isNaN(remindAt) && remindAt < Date.now();
}
