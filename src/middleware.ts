import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './lib/jwt'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/login',
  '/forgot-password',
  '/_next',
  '/favicon.ico',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  console.log(`[MIDDLEWARE] ${req.method} ${pathname}`)

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Protect API routes
  if (pathname.startsWith('/api/')) {
    let token = ''
    const authHeader = req.headers.get('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else {
      token = req.cookies.get('access_token')?.value || ''
    }

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
      await verifyAccessToken(token)
      return NextResponse.next()
    } catch {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }
  }

  // Protect dashboard pages — check cookie
  if (pathname.startsWith('/dashboard') || pathname === '/') {
    const token = req.cookies.get('access_token')?.value
    console.log(`[MIDDLEWARE] Checking token for ${pathname}, found: ${token ? 'yes' : 'no'}`)
    
    if (!token) {
      console.log(`[MIDDLEWARE] No token, redirecting to /login`)
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      await verifyAccessToken(token)
      console.log(`[MIDDLEWARE] Token valid, allowing access`)
      return NextResponse.next()
    } catch (err) {
      console.log(`[MIDDLEWARE] Token invalid, redirecting to /login:`, (err as Error).message)
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
