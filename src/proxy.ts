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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const access = classify(pathname)

  const isAuthenticated =
    request.cookies.has('access_token') ||
    request.cookies.has('refresh_token')

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
