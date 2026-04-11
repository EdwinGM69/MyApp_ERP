import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { z } from 'zod'

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const attempts = loginAttempts.get(ip)

  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  return true
}

const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(128),
  remember: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown'
    const ip = clientIP.split(',')[0].trim()

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' }, { status: 429 })
    }

    // CSRF protection: check if CSRF token matches
    const csrfToken = req.headers.get('x-csrf-token')
    const csrfCookie = req.cookies.get('csrf_token')?.value

    if (csrfToken && csrfCookie && csrfToken !== csrfCookie) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, remember } = loginSchema.parse(body)

    console.log('[LOGIN] Attempting login for email:', email)

    let usuario
    try {
      usuario = await prisma.usuario.findFirst({
        where: { email, activo: true },
        include: { empresa: true, rol: true },
      })
    } catch (dbError: any) {
      console.error('[LOGIN] Database error:', dbError.message)
      return NextResponse.json({ error: 'Error de base de datos. Contacte al administrador.' }, { status: 500 })
    }

    console.log('[LOGIN] Usuario found:', usuario ? 'yes' : 'no', usuario?.id)

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Check if empresa exists
    if (!usuario.empresa) {
      console.error('[LOGIN] Usuario has no empresa associated')
      return NextResponse.json({ error: 'Error de configuración. Contacte al administrador.' }, { status: 500 })
    }

    const validPassword = await bcrypt.compare(password, usuario.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const payload = {
      userId: usuario.id,
      empresaId: usuario.empresa_id,
      rolId: usuario.rol_id,
      email: usuario.email,
    }

    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    console.log('[LOGIN] Tokens generated, looking up moneda')

    // Lookup moneda_id for moneda_default abbreviation
    let moneda = null
    try {
      if (usuario.empresa_id && usuario.empresa.moneda_default) {
        console.log('[LOGIN] Querying moneda for empresa_id:', usuario.empresa_id, 'moneda_default:', usuario.empresa.moneda_default)
        moneda = await prisma.moneda.findFirst({
          where: { 
            empresa_id: usuario.empresa_id,
            abreviatura: usuario.empresa.moneda_default
          }
        })
        console.log('[LOGIN] Moneda found:', moneda ? 'yes' : 'no')
      } else {
        console.log('[LOGIN] Skipping moneda query - empresa_id or moneda_default is null')
      }
    } catch (monedaError: any) {
      console.error('[LOGIN] Error fetching moneda:', monedaError.message)
      moneda = null
    }

    const response = NextResponse.json({
      accessToken,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol.nombre,
        empresa: usuario.empresa.nombre,
        empresaId: usuario.empresa_id,
        monedaDefault: usuario.empresa.moneda_default || null,
        monedaId: moneda?.id || null,
        monedaSimbolo: moneda?.simbolo || '$',
      },
    })

    // Set tokens as HttpOnly cookies
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    }

    if (remember) {
      cookieOptions.maxAge = 60 * 60 * 24 * 7 // 7 days
    }

    console.log('[LOGIN] Setting cookies:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
      cookieOptions,
      environment: process.env.NODE_ENV
    })

    response.cookies.set('access_token', accessToken, cookieOptions)
    response.cookies.set('refresh_token', refreshToken, cookieOptions)

    return response
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Don't leak validation details in production
      console.warn('[LOGIN] Validation error:', err.errors)
      return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 })
    }

    // Log detailed error information for debugging
    console.error('[LOGIN] Unexpected error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
