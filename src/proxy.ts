import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './lib/jwt'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/csrf',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/me', // Allow session check to reach the handler
  '/login',
  '/forgot-password',
  '/_next',
  '/favicon.ico',
]

/**
 * Modern Next.js Proxy/Middleware Layer
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  console.log(`[PROXY] ${req.method} ${pathname}`)

  // 0. Enforce HTTPS in production for API routes
  if (
    process.env.NODE_ENV === 'production' &&
    req.nextUrl.protocol === 'http:' &&
    pathname.startsWith('/api/')
  ) {
    const httpsUrl = req.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl)
  }

  // 1. Allow public paths and static assets
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isStaticAsset = pathname.includes('.') || pathname.startsWith('/_next')

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next()
  }

  // 2. Protect API routes
  if (pathname.startsWith('/api/')) {
    let token = ''
    const authHeader = req.headers.get('authorization')

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else {
      token = req.cookies.get('access_token')?.value || ''
    }

    if (!token) {
      console.log(`[PROXY] API 401: No token for ${pathname}`)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
      await verifyAccessToken(token)
      return NextResponse.next()
    } catch (err: any) {
      console.log(`[PROXY] API 401: Token invalid/expired for ${pathname}: ${err.message}`)
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }
  }

  // 3. Protect Page routes
  const token = req.cookies.get('access_token')?.value

  if (!token) {
    console.log(`[PROXY] PAGE Redirect: No token for ${pathname}, redirecting to /login`)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await verifyAccessToken(token)
    return NextResponse.next()
  } catch (err: any) {
    console.log(`[PROXY] PAGE Redirect: Session invalid for ${pathname} (${err.message}), clearing cookies and redirecting`)
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
