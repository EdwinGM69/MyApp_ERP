import { NextRequest } from 'next/server'
import { verifyAccessToken, JWTPayload } from './jwt'

export async function getAuthPayload(req: NextRequest): Promise<JWTPayload | null> {
  try {
    let token = ''
    const authHeader = req.headers.get('authorization')

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
      console.log('[AUTH] Using Bearer token')
    } else {
      token = req.cookies.get('access_token')?.value || ''
      console.log('[AUTH] Using cookie token, length:', token.length)
    }

    if (!token) {
      console.log('[AUTH] No token found')
      return null
    }

    const payload = await verifyAccessToken(token)
    console.log('[AUTH] Token verified successfully for user:', payload.userId)
    return payload
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error)
    return null
  }
}

export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  const payload = await getAuthPayload(req)
  if (!payload) {
    console.log('[AUTH] No valid token found in request')
    throw new Error('Unauthorized')
  }
  return payload
}

export async function requireAdmin(req: NextRequest): Promise<JWTPayload> {
  const payload = await requireAuth(req)
  if (payload.rolId !== 1) throw new Error('Forbidden')
  return payload
}
