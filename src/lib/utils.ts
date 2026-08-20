import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([$*+?.()|[\]{}\\^])/g, '\\$1') + '=([^;]*)'),
  )
  return match ? decodeURIComponent(match[1]) : null
}

export function setCookie(
  name: string,
  value: string,
  options: { path?: string; maxAge?: number; sameSite?: 'Strict' | 'Lax' | 'None' } = {},
) {
  if (typeof document === 'undefined') return
  const { path = '/', maxAge, sameSite = 'Lax' } = options
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `path=${path}`,
    sameSite ? `SameSite=${sameSite}` : '',
    maxAge !== undefined ? `max-age=${maxAge}` : '',
  ]
    .filter(Boolean)
    .join('; ')
  document.cookie = attrs
}
