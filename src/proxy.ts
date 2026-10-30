import { NextResponse, type NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const ACCESS_REFRESH_LEAD_MS = 60_000

async function isConfirmedSessionExpiry(response: Response): Promise<boolean> {
  if (response.status !== 401) return false
  try {
    const body = (await response.clone().json()) as { code?: string }
    return body.code === 'SESSION_EXPIRED' || body.code === 'TOKEN_REVOKED'
  } catch {
    return false
  }
}

function clearAuthCookies(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieOptions = {
    path: '/',
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 0,
    expires: new Date(0),
  }
  response.cookies.set('access_token', '', cookieOptions)
  response.cookies.set('refresh_token', '', cookieOptions)
}

async function probeAccess(access: string): Promise<'valid' | 'invalid' | 'unavailable'> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `access_token=${access}` },
      cache: 'no-store',
    })
    if (response.ok) return 'valid'
    if (response.status === 401) return 'invalid'
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}

function accessExpiresSoon(access: string | undefined): boolean {
  if (!access) return true
  try {
    const encoded = access.split('.')[1]
    if (!encoded) return true
    const payload = JSON.parse(
      atob(encoded.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }
    return !payload.exp || payload.exp * 1000 <= Date.now() + ACCESS_REFRESH_LEAD_MS
  } catch {
    // Invalid/malformed JWT is only a refresh hint; backend remains authority.
    return true
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const authPage = path === '/auth' || path === '/auth/' || path.startsWith('/auth/callback')
  const publicPage = authPage || path === '/join' || path.startsWith('/join/')
  const access = request.cookies.get('access_token')?.value
  const refresh = request.cookies.get('refresh_token')?.value
  let response: NextResponse | null = null

  // Không decode JWT ở proxy để kết luận phiên hợp lệ. Backend mới là authority:
  // access 401 thì thử refresh; lỗi hạ tầng không bị biến thành logout.
  const accessState = !authPage && access
    ? await probeAccess(access)
    : access
      ? 'valid'
      : 'invalid'

  if (
    !authPage &&
    refresh &&
    (accessState === 'invalid' || accessExpiresSoon(access))
  ) {
    try {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `refresh_token=${refresh}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
      if (refreshed.ok) {
        const setCookies = refreshed.headers.getSetCookie()
        const requestHeaders = new Headers(request.headers)
        const newAccess = setCookies.find((cookie) => cookie.startsWith('access_token='))?.split(';')[0]
        const newRefresh = setCookies.find((cookie) => cookie.startsWith('refresh_token='))?.split(';')[0]
        const requestCookies = new Map(
          request.cookies.getAll().map(({ name, value }) => [name, value]),
        )
        if (newAccess) requestCookies.set('access_token', newAccess.slice('access_token='.length))
        if (newRefresh) requestCookies.set('refresh_token', newRefresh.slice('refresh_token='.length))
        requestHeaders.set(
          'Cookie',
          Array.from(requestCookies, ([name, value]) => `${name}=${value}`).join('; '),
        )
        response = NextResponse.next({ request: { headers: requestHeaders } })
        for (const cookie of setCookies) response.headers.append('set-cookie', cookie)
      } else if (await isConfirmedSessionExpiry(refreshed)) {
        if (!publicPage) {
          const url = new URL('/auth', request.url)
          url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
          response = NextResponse.redirect(url)
        } else response = NextResponse.next()
        clearAuthCookies(response)
      } else {
        return new NextResponse('Authentication service temporarily unavailable', { status: 503 })
      }
    } catch { return new NextResponse('Authentication service temporarily unavailable', { status: 503 }) }
  }

  if (!authPage && accessState === 'unavailable') {
    return new NextResponse('Authentication service temporarily unavailable', { status: 503 })
  }

  if (!response && !publicPage && !access && !refresh) {
    const url = new URL('/auth', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (!response) response = NextResponse.next()
  const locale = request.cookies.get('NEXT_LOCALE')?.value
  if (locale === 'en' || locale === 'vi') response.headers.set('Accept-Language', locale)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
