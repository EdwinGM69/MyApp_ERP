import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  try {
    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex')

    const response = NextResponse.json({
      csrfToken,
      success: true
    })

    // Set CSRF token as cookie
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    return response
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token', success: false },
      { status: 500 }
    )
  }
}