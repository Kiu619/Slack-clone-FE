import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALWAYS_PUBLIC = ['/auth', '/join']
const AUTH_INTERNAL = ['/auth/callback']

function classify(pathname: string): 'public' | 'auth-internal' | 'protected' {
  if (AUTH_INTERNAL.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return 'auth-internal'
  }
  if (ALWAYS_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return 'public'
  }
  return 'protected'
}

/**
 * Decode JWT payload (không verify signature) — chỉ đọc `exp` để biết còn hạn không.
 * Middleware Edge không cần verify chữ ký vì backend là nguồn xác thực cuối cùng;
 * nếu token giả, request tới API protected sẽ trả 401 ngay và axios interceptor xử lý.
 */
function isJwtUsable(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  try {
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    if (typeof payload.exp !== 'number') return false
    // Trừ 30s leeway để tránh race với access_token sắp hết hạn
    return payload.exp * 1000 > Date.now() + 30_000
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const access = classify(pathname)

  const refreshToken = request.cookies.get('refresh_token')?.value
  const accessToken = request.cookies.get('access_token')?.value

  // refresh_token còn hạn ⇒ session còn sống, kể cả khi access_token đã expire.
  // access_token còn hạn ⇒ chắc chắn authenticated.
  const isAuthenticated =
    isJwtUsable(refreshToken) || isJwtUsable(accessToken)

  // auth-internal: must render regardless of auth state (e.g. OAuth callback)
  if (access === 'auth-internal') return NextResponse.next()

  // public + authenticated: bounce home
  if (access === 'public' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // protected + unauthenticated: bounce to /auth with redirect param
  if (access === 'protected' && !isAuthenticated) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set(
      'redirect',
      request.nextUrl.pathname + request.nextUrl.search + request.nextUrl.hash,
    )
    return NextResponse.redirect(redirectUrl)
  }

  // i18n: forward NEXT_LOCALE cookie to Accept-Language for server-side locale detection
  const locale = request.cookies.get('NEXT_LOCALE')?.value
  if (locale && ['en', 'vi'].includes(locale)) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('Accept-Language', locale)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}