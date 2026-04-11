import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  console.log('[CSRF] Request received from:', req.headers.get('origin') || req.headers.get('referer'))
  try {
    const csrfToken = crypto.randomBytes(32).toString('hex')
    console.log('[CSRF] Token generated successfully')

    const response = NextResponse.json({
      csrfToken,
      success: true
    })

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })

    console.log('[CSRF] Response sent successfully')
    return response
  } catch (error) {
    console.error('[CSRF] Error generating token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token', success: false },
      { status: 500 }
    )
  }
}