import { SignJWT, jwtVerify, JWTPayload as JosePayload } from 'jose'

const JWT_SECRET_KEY = process.env.JWT_SECRET
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET

// Validate secrets only when actually needed, not during module initialization
function validateSecrets() {
  if (!JWT_SECRET_KEY || JWT_SECRET_KEY.length < 32) {
    const error = new Error(`JWT_SECRET must be set and at least 32 characters long. Current length: ${JWT_SECRET_KEY?.length || 0}`)
    console.error('[JWT] Secret validation failed:', error.message)
    throw error
  }
  if (!JWT_REFRESH_SECRET_KEY || JWT_REFRESH_SECRET_KEY.length < 32) {
    const error = new Error(`JWT_REFRESH_SECRET must be set and at least 32 characters long. Current length: ${JWT_REFRESH_SECRET_KEY?.length || 0}`)
    console.error('[JWT] Secret validation failed:', error.message)
    throw error
  }
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_KEY || 'dev-secret-change-in-production')
const JWT_REFRESH_SECRET = new TextEncoder().encode(JWT_REFRESH_SECRET_KEY || 'dev-refresh-secret-change-in-production')

export interface JWTPayload extends JosePayload {
  userId: number
  empresaId: number
  rolId: number
  email: string
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  validateSecrets()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  validateSecrets()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  validateSecrets()
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as JWTPayload
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  validateSecrets()
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
  return payload as JWTPayload
}
