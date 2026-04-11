import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const conceptoCajaSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  tipo_operacion: z.enum(['Ingreso', 'Egreso']),
  requiere_cliente: z.boolean().optional(),
  requiere_proveedor: z.boolean().optional(),
  requiere_persona: z.boolean().optional(),
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
          { codigo: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const conceptos = await prisma.conceptoCaja.findMany({
      where,
      orderBy: { codigo: 'asc' },
    })

    return NextResponse.json({ data: conceptos })
  } catch (err) {
    console.error('[GET /api/tesoreria/conceptos-caja] Error:', err)
    return NextResponse.json({ error: 'Error al obtener conceptos de caja' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = conceptoCajaSchema.parse(body)

    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.conceptoCaja.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un concepto con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un concepto con esta descripción.' }, { status: 400 })
        }
      }
    }

    const concepto = await prisma.conceptoCaja.create({
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        tipo_operacion: data.tipo_operacion,
        requiere_cliente: data.requiere_cliente ?? false,
        requiere_proveedor: data.requiere_proveedor ?? false,
        requiere_persona: data.requiere_persona ?? false,
        activo: data.activo ?? true,
        empresa: { connect: { id: empresaId } },
        usuario_creador: userId ? { connect: { id: userId } } : undefined
      },
    })

    return NextResponse.json(concepto, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/tesoreria/conceptos-caja] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código del concepto ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el concepto de caja', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = conceptoCajaSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.conceptoCaja.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un concepto con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un concepto con esta descripción.' }, { status: 400 })
        }
      }
    }

    const concepto = await prisma.conceptoCaja.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        tipo_operacion: data.tipo_operacion,
        requiere_cliente: data.requiere_cliente,
        requiere_proveedor: data.requiere_proveedor,
        requiere_persona: data.requiere_persona,
        activo: data.activo,
        usuario_modificador: userId ? { connect: { id: userId } } : undefined
      },
    })

    return NextResponse.json(concepto)
  } catch (err: any) {
    console.error('[PUT /api/tesoreria/conceptos-caja] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el concepto de caja', details: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.conceptoCaja.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.conceptoCaja.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        usuario_modificador: userId ? { connect: { id: userId } } : undefined
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/tesoreria/conceptos-caja] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del concepto de caja' }, { status: 500 })
  }
}
