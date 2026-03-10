import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth', '/auth/callback', '/join']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  const hasAccessToken = request.cookies.has('access_token')
  const hasRefreshToken = request.cookies.has('refresh_token')
  const isAuthenticated = hasAccessToken || hasRefreshToken

  // Authenticated user tries to access /auth → redirect to home
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Unauthenticated user tries to access protected route → redirect to /auth
  if (!isPublicPath && !isAuthenticated) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
