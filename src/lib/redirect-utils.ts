/**
 * Client-side helper to extract & lightly clean a redirect query param.
 * Server (BE) is the source of truth for sanitization; this just trims
 * obviously-bad values before passing them along. Always returns a value
 * starting with "/" or null.
 */
export function readRedirectParam(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  if (value.includes('://')) return null
  if (value.length > 2048) return null
  return value
}
