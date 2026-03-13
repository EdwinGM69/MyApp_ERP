import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const descuentoSchema = z.object({
  material_id: z.number(),
  tipo: z.enum(['porcentaje', 'valor']),
  valor: z.coerce.number().min(0),
  fecha_inicio: z.string(),
  fecha_fin: z.string().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { material: { descripcion: { contains: search, mode: 'insensitive' as const } } } : {}),
    }

    const [total, descuentos] = await Promise.all([
      prisma.descuento.count({ where }),
      prisma.descuento.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { material: { select: { descripcion: true, codigo: true } } },
      }),
    ])

    return NextResponse.json({ data: descuentos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener descuentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = descuentoSchema.parse(body)

    const descuento = await prisma.descuento.create({
      data: { ...data, empresa_id: empresaId, created_by: userId },
    })
    return NextResponse.json(descuento, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear descuento' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = descuentoSchema.parse(rest)

    const descuento = await prisma.descuento.update({
      where: { id, empresa_id: empresaId },
      data: { ...data, updated_by: userId },
    })
    return NextResponse.json(descuento)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar descuento' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.descuento.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar descuento' }, { status: 500 })
  }
}
