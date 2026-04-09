import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'No hay token de refresco' }, { status: 401 })
    }

    const payload = await verifyRefreshToken(refreshToken)
    const accessToken = await signAccessToken({
      userId: payload.userId,
      empresaId: payload.empresaId,
      rolId: payload.rolId,
      email: payload.email,
    })

    const response = NextResponse.json({ accessToken })
    
    // Set new access token cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Token de refresco inválido' }, { status: 401 })
  }
}
