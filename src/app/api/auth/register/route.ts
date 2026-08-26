import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { z } from 'zod'

// Simple in-memory rate limiter
const registerAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxAttempts = 5

  const attempts = registerAttempts.get(ip)

  if (!attempts || now > attempts.resetTime) {
    registerAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  return true
}

const registerSchema = z.object({
  nombre: z.string().trim().min(3).max(120),
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(128),
  plan: z.enum(['free', 'monthly', 'annual']).default('free'),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const ip = clientIP.split(',')[0].trim()

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Intente nuevamente en 1 hora.' },
        { status: 429 }
      )
    }

    // CSRF protection: check if CSRF token matches
    const csrfToken = req.headers.get('x-csrf-token')
    const csrfCookie = req.cookies.get('csrf_token')?.value

    if (csrfToken && csrfCookie && csrfToken !== csrfCookie) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, email, password, plan } = registerSchema.parse(body)

    console.log('[REGISTER] Attempting registration for email:', email, 'plan:', plan)

    // Check if email is already registered (across any empresa)
    const existingUsuario = await prisma.usuario.findFirst({
      where: { email },
    })

    if (existingUsuario) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta registrada con este correo electrónico' },
        { status: 409 }
      )
    }

    // Lookup admin rol
    const rol = await prisma.rol.findFirst({
      where: { nombre: 'superadmin', activo: true },
    })

    if (!rol) {
      console.error('[REGISTER] Rol superadmin not found')
      return NextResponse.json(
        { error: 'Error de configuración. Contacte al administrador.' },
        { status: 500 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Provisional empresa data: completed later in the company setup form
    const tempNif = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const usuario = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nombre: `Empresa de ${nombre}`,
          nif: tempNif,
          email,
          moneda_default: 'USD',
          zona_horaria: 'UTC',
          activo: true,
        },
      })

      const nuevoUsuario = await tx.usuario.create({
        data: {
          empresa_id: empresa.id,
          rol_id: rol.id,
          nombre,
          email,
          password_hash: passwordHash,
          activo: true,
        },
      })

      await tx.usuarioRol.create({
        data: {
          usuario_id: nuevoUsuario.id,
          rol_id: rol.id,
          assigned_by: nuevoUsuario.id,
        },
      })

      // Seed default catalogs so the onboarding dropdowns have data
      await tx.documentoIdentificacion.createMany({
        data: [
          { empresa_id: empresa.id, descripcion: 'DNI', abreviatura: 'DNI', tipo: 'natural', created_by: nuevoUsuario.id },
          { empresa_id: empresa.id, descripcion: 'RUC', abreviatura: 'RUC', tipo: 'juridica', created_by: nuevoUsuario.id },
          { empresa_id: empresa.id, descripcion: 'Carnet de Extranjería', abreviatura: 'CE', tipo: 'natural', created_by: nuevoUsuario.id },
          { empresa_id: empresa.id, descripcion: 'Pasaporte', abreviatura: 'PAS', tipo: 'natural', created_by: nuevoUsuario.id },
        ],
      })

      const industriasDefault = [
        'Comercio / Retail',
        'Servicios',
        'Tecnología',
        'Manufactura',
        'Restaurantes',
        'Salud',
        'Educación',
        'Construcción',
        'Transporte',
        'Agroindustria',
      ]

      await tx.industria.createMany({
        data: industriasDefault.map((descripcion) => ({
          empresa_id: empresa.id,
          descripcion,
          created_by: nuevoUsuario.id,
        })),
      })

      return tx.usuario.findFirst({
        where: { id: nuevoUsuario.id },
        include: { empresa: true, rol: true },
      })
    })

    if (!usuario || !usuario.empresa || !usuario.rol) {
      return NextResponse.json(
        { error: 'Error al crear la cuenta. Intente nuevamente.' },
        { status: 500 }
      )
    }

    console.log('[REGISTER] Usuario created:', usuario.id, 'empresa:', usuario.empresa_id)

    const payload = {
      userId: usuario.id,
      empresaId: usuario.empresa_id,
      rolId: usuario.rol_id,
      email: usuario.email,
    }

    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    const response = NextResponse.json({
      accessToken,
      plan,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol.nombre,
        empresa: usuario.empresa.nombre,
        empresaId: usuario.empresa_id,
        monedaDefault: usuario.empresa.moneda_default,
        monedaId: null,
        monedaSimbolo: '$',
      },
    })

    // Set tokens as HttpOnly cookies
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days to match refresh token lifetime
    }

    response.cookies.set('access_token', accessToken, cookieOptions)
    response.cookies.set('refresh_token', refreshToken, cookieOptions)

    return response
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Don't leak validation details in production
      console.warn('[REGISTER] Validation error:', err.errors)
      return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 })
    }

    console.error('[REGISTER] Unexpected error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip'),
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
