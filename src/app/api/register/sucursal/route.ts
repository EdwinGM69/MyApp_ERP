import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload } from '@/lib/auth'
import { z } from 'zod'

const sucursalSchema = z.object({
  nombreSucursal: z.string().trim().min(3).max(120),
  direccion: z.string().trim().min(5).max(255),
  celular: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,15}$/)
    .optional()
    .or(z.literal('')),
})

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: check if CSRF token matches
    const csrfToken = req.headers.get('x-csrf-token')
    const csrfCookie = req.cookies.get('csrf_token')?.value

    if (csrfToken && csrfCookie && csrfToken !== csrfCookie) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
    }

    // Authenticated onboarding endpoint: resolve empresa/user from token
    const payload = await getAuthPayload(req)

    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { nombreSucursal, direccion, celular } = sucursalSchema.parse(body)

    console.log('[REGISTER-SUCURSAL] Creating sucursal for empresa:', payload.empresaId)

    const result = await prisma.$transaction(async (tx) => {
      const sucursal = await tx.sucursal.create({
        data: {
          empresa_id: payload!.empresaId,
          descripcion: nombreSucursal,
          direccion,
          created_by: payload!.userId,
        },
      })

      await tx.usuarioSucursal.create({
        data: {
          usuario_id: payload!.userId,
          sucursal_id: sucursal.id,
          created_by: payload!.userId,
        },
      })

      await tx.usuario.update({
        where: { id: payload!.userId },
        data: { last_sucursal_id: sucursal.id },
      })

      if (celular) {
        await tx.empresa.update({
          where: { id: payload!.empresaId },
          data: { telefono: celular, updated_by: payload!.userId },
        })
      }

      return sucursal
    })

    console.log('[REGISTER-SUCURSAL] Sucursal created:', result.id)

    return NextResponse.json(
      { ok: true, sucursalId: result.id },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn('[REGISTER-SUCURSAL] Validation error:', err.errors)
      return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 })
    }

    if ((err as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una sucursal con ese nombre en tu empresa' },
        { status: 400 }
      )
    }

    console.error('[REGISTER-SUCURSAL] Unexpected error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
