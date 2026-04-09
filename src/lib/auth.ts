import { NextRequest } from 'next/server'
import { verifyAccessToken, JWTPayload } from './jwt'

export async function getAuthPayload(req: NextRequest): Promise<JWTPayload | null> {
  try {
    let token = ''
    const authHeader = req.headers.get('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else {
      token = req.cookies.get('access_token')?.value || ''
    }

    if (!token) return null
    return await verifyAccessToken(token)
  } catch {
    return null
  }
}

export async function requireAuth(req: NextRequest): Promise<JWTPayload> {
  const payload = await getAuthPayload(req)
  if (!payload) throw new Error('Unauthorized')
  return payload
}

export async function requireAdmin(req: NextRequest): Promise<JWTPayload> {
  const payload = await requireAuth(req)
  if (payload.rolId !== 1) throw new Error('Forbidden')
  return payload
}
