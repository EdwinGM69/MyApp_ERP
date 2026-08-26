import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Simple in-memory rate limiter (more permissive: UX availability check)
const checkAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxAttempts = 30

  const attempts = checkAttempts.get(ip)

  if (!attempts || now > attempts.resetTime) {
    checkAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  return true
}

const emailSchema = z.string().email().max(254).toLowerCase().trim()

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const ip = clientIP.split(',')[0].trim()

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente nuevamente en un minuto.' },
        { status: 429 }
      )
    }

    const emailParam = req.nextUrl.searchParams.get('email') || ''
    const parsed = emailSchema.safeParse(emailParam)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 })
    }

    console.log('[CHECK-EMAIL] Checking availability for:', parsed.data)

    // Compare against Usuario.email across ALL empresas (no empresa_id filter)
    const existingUsuario = await prisma.usuario.findFirst({
      where: { email: parsed.data },
      select: { id: true },
    })

    return NextResponse.json({ exists: !!existingUsuario })
  } catch (err) {
    console.error('[CHECK-EMAIL] Unexpected error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
