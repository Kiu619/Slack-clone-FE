/**
 * Channel name validation & slug helpers — isomorphic (no "use client").
 *
 * Allowlist ký tự hợp lệ: bất kỳ chữ cái hoặc chữ số Unicode (\p{L}\p{N}),
 * dấu gạch ngang (-), và khoảng trắng ( ).
 *
 * KHÔNG cho phép: gạch dưới (_), emoji (😀, 🎉, …), ký tự điều khiển,
 * ký tự zero-width, ký hiệu đặc biệt khác (!@#$%^&*=+…).
 *
 * Emoji & symbol KHÔNG nằm trong allowlist → tự động bị từ chối bởi
 * `isValidChannelName` / `getChannelNameError`. Không cần liệt kê Unicode
 * emoji blocks (rất nhiều, dễ sót) — allowlist tự loại trừ.
 */

export const CHANNEL_NAME_MIN = 2
export const CHANNEL_NAME_MAX = 80

const ALLOWED_NAME_CHARS = /[\p{L}\p{N}\- ]/u

/**
 * Lowercase + trim + thay khoảng trắng liên tiếp thành "-".
 * KHÔNG strip emoji / underscore — để user thấy rõ những gì họ gõ.
 * Emoji & `_` sẽ bị Zod validation từ chối real-time qua FormMessage
 * (hoặc toast.error ở about-tab) khi gọi `getChannelNameError`.
 */
export function slugifyChannelName(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '-')
}

/**
 * Normalize input trong khi user đang gõ (controlled <input> onChange).
 * CHỈ thay khoảng trắng liên tiếp bằng '-', KHÔNG trim(), KHÔNG toLowerCase().
 * Lý do: trim() giữa lúc user gõ sẽ cắt trailing space và làm React
 * controlled input reset, mất cursor.
 *
 * `slugifyChannelName` vẫn dùng khi save (để normalize final value).
 */
export function normalizeChannelNameInput(raw: string): string {
  return raw.replace(/\s+/g, '-')
}

/** Tên channel hợp lệ: 2..80 ký tự, toàn bộ nằm trong allowlist. */
export function isValidChannelName(raw: string): boolean {
  const v = raw.trim()
  if (v.length < CHANNEL_NAME_MIN || v.length > CHANNEL_NAME_MAX) return false
  for (const ch of v) {
    if (!ALLOWED_NAME_CHARS.test(ch)) return false
  }
  return true
}

/**
 * Trả thông báo lỗi thân thiện (chuỗi EN, không phụ thuộc i18n để dùng
 * được cả client & server). Trả null nếu tên hợp lệ.
 */
export function getChannelNameError(raw: string): string | null {
  const v = raw.trim()
  if (v.length === 0) return 'Channel name cannot be empty'
  if (v.length < CHANNEL_NAME_MIN) {
    return `Channel name must be at least ${CHANNEL_NAME_MIN} characters`
  }
  if (v.length > CHANNEL_NAME_MAX) {
    return `Channel name must be at most ${CHANNEL_NAME_MAX} characters`
  }
  for (const ch of v) {
    if (!ALLOWED_NAME_CHARS.test(ch)) {
      return 'Channel name can only contain letters, numbers, hyphens and spaces'
    }
  }
  return null
}

/**
 * Trả về danh sách các ký tự KHÔNG hợp lệ xuất hiện trong tên.
 * Bỏ qua khoảng trắng/tab/newline (sẽ bị slugify thành '-'), chỉ liệt kê
 * ký tự thực sự bị reject: emoji, '_', ký hiệu đặc biệt, control chars.
 * Dùng để hiển thị thông báo lỗi real-time dưới input.
 */
export function getChannelNameInvalidChars(raw: string): string[] {
  const invalid = new Set<string>()
  for (const ch of raw) {
    if (ch === ' ' || ch === '\t' || ch === '\n') continue
    if (!ALLOWED_NAME_CHARS.test(ch)) invalid.add(ch)
  }
  return [...invalid]
}
