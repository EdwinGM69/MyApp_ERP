import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { equal } from 'assert'

const medioPagoSchema = z.object({
  id: z.number().optional(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  aplica_denominacion: z.boolean().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const medios = await prisma.medioPago.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ data: medios })
  } catch (err) {
    console.error('[GET /api/tesoreria/medios-pago] Error:', err)
    return NextResponse.json({ error: 'Error al obtener medios de pago' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = medioPagoSchema.parse(body)

    // Verifica duplicado ignoring case
    const existente = await prisma.medioPago.findFirst({
      where: {
        empresa_id: empresaId,
        descripcion: { equals: data.descripcion, mode: 'insensitive' }
      }
    })

    if (existente) {
      return NextResponse.json(
        { error: 'Este medio de pago ya existe para esta empresa.' },
        { status: 400 }
      )
    }


    const medio = await prisma.medioPago.create({
      data: {
        descripcion: data.descripcion,
        aplica_denominacion: data.aplica_denominacion ?? false,
        activo: data.activo ?? true,
        empresa: { connect: { id: empresaId } },
        usuario_creador: userId ? { connect: { id: userId } } : undefined
      },
    })

    return NextResponse.json(medio, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/tesoreria/medios-pago] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Este medio de pago ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el medio de pago', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = medioPagoSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Verificar duplicado (excluyendo el registro actual)
    const existente = await prisma.medioPago.findFirst({
      where: {
        empresa_id: empresaId,
        descripcion: { equals: data.descripcion, mode: 'insensitive' },
        NOT: { id: Number(id) }
      }
    })
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe otro medio de pago con esa descripción.' },
        { status: 400 }
      )
    }

    const medio = await prisma.medioPago.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        descripcion: data.descripcion,
        aplica_denominacion: data.aplica_denominacion,
        activo: data.activo,
        usuario_modificador: userId ? { connect: { id: userId } } : undefined
      },
    })

    return NextResponse.json(medio)
  } catch (err: any) {
    console.error('[PUT /api/tesoreria/medios-pago] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el medio de pago', details: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.medioPago.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.medioPago.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        usuario_modificador: userId ? { connect: { id: userId } } : undefined
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/tesoreria/medios-pago] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del medio de pago' }, { status: 500 })
  }
}
