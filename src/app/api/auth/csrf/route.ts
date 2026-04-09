import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  // Generate CSRF token
  const csrfToken = crypto.randomBytes(32).toString('hex')

  const response = NextResponse.json({ csrfToken })

  // Set CSRF token as cookie
  response.cookies.set('csrf_token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })

  return response
}