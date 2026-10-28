/**
 * Minimal local copy of the Translator signature — we only need the
 * `t()` and `t.markup()` methods, so we don't import the full use-intl
 * type machinery (which is not exported from the package's `exports`).
 */
type Translator = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (key: string, values?: Record<string, any>): string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markup(key: string, values?: Record<string, any>): string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

export type TimelineKind =
  | "channel_name"
  | "channel_topic"
  | "channel_description"
  | "channel_posting_permissions"
  | "channel_privacy"
  | "dm_topic"
  | "dm_description"
  | "dm_merge"
  | "dm_merged_out"

const MARKER_PREFIX = "__TIMELINE__:"
const MARKER_RE = /^__TIMELINE__:([a-z_]+):([\s\S]*)$/

/** HTML wrapper cho {value} trong i18n string `<b>{value}</b>`. */
const BOLD_TAG = {
  b: (chunks: string) => `<b>${chunks}</b>`,
} as const

/**
 * Trả về HTML đã được i18n cho timeline message.
 * - Nếu content có marker `__TIMELINE__:<kind>:<value>` → dịch theo kind.
 * - Nếu không có marker (legacy data) → fallback trả về content raw (escaped).
 *
 * `t` phải được init với namespace `"chat"` để trỏ tới
 * `chat.timeline.*` keys. Helper này không tự wrap namespace để tránh
 * gọi hook ở module top-level.
 *
 * Các key có `<b>{value}</b>` dùng `t.markup()` (raw HTML string); các
 * key plain dùng `t()`. Value user đã được escapeHtml trước khi
 * interpolate để chống XSS.
 */
export function renderTimelineContent(
  rawContent: string,
  t: Translator,
): string {
  const match = rawContent.match(MARKER_RE)
  if (!match) return escapeHtml(rawContent)

  const [, kind, rawValue] = match
  const value = rawValue.trim()
  const escaped = escapeHtml(value)

  switch (kind as TimelineKind) {
    case "channel_name":
      return value
        ? t.markup("timeline.renamedChannelTo", {
            value: escaped,
            ...BOLD_TAG,
          })
        : t("timeline.removedChannelName")
    case "channel_topic":
      return value
        ? t.markup("timeline.setChannelTopic", {
            value: escaped,
            ...BOLD_TAG,
          })
        : t("timeline.removedChannelTopic")
    case "channel_description":
      return value
        ? t.markup("timeline.setChannelDescription", {
            value: escaped,
            ...BOLD_TAG,
          })
        : t("timeline.removedChannelDescription")
    case "channel_posting_permissions":
      return t("timeline.changedPostingPermissions")
    case "channel_privacy":
      return value === "private"
        ? t("timeline.changedToPrivate")
        : t("timeline.changedToPublic")
    case "dm_topic":
      return value
        ? t.markup("timeline.setDmTopic", {
            value: escaped,
            ...BOLD_TAG,
          })
        : t("timeline.removedDmTopic")
    case "dm_description":
      return value
        ? t.markup("timeline.setDmDescription", {
            value: escaped,
            ...BOLD_TAG,
          })
        : t("timeline.removedDmDescription")
    case "dm_merge":
      return t("timeline.dmMerged")
    case "dm_merged_out":
      return t("timeline.dmMergedOut")
    default:
      return escapeHtml(rawContent)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export const TIMELINE_MARKER_PREFIX = MARKER_PREFIX