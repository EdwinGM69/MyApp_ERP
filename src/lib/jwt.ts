import { SignJWT, jwtVerify, JWTPayload as JosePayload } from 'jose'

const JWT_SECRET_KEY = process.env.JWT_SECRET
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET

if (!JWT_SECRET_KEY || JWT_SECRET_KEY.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long')
}
if (!JWT_REFRESH_SECRET_KEY || JWT_REFRESH_SECRET_KEY.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long')
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_KEY)
const JWT_REFRESH_SECRET = new TextEncoder().encode(JWT_REFRESH_SECRET_KEY)

export interface JWTPayload extends JosePayload {
  userId: number
  empresaId: number
  rolId: number
  email: string
}

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as JWTPayload
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
  return payload as JWTPayload
}
