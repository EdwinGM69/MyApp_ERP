import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const materialSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  categoria: z.string().optional(),
  tipo: z.enum(['producto', 'servicio']),
  unidad_medida: z.string().optional(),
  precio_costo: z.coerce.number().min(0),
  precio_venta: z.coerce.number().min(0),
  stock_actual: z.coerce.number().min(0).optional(),
  stock_minimo: z.coerce.number().min(0).optional(),
  imagen_url: z.string().optional(),
  impuesto_id: z.coerce.number().optional().nullable(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const categoria = searchParams.get('categoria') ?? ''
    const tipo = searchParams.get('tipo') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { descripcion: { contains: search, mode: 'insensitive' as const } },
        { codigo: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
      ...(categoria ? { categoria } : {}),
      ...(tipo ? { tipo } : {}),
    }

    const [total, materiales] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        include: { impuesto: { select: { codigo: true, porcentaje: true } } },
      }),
    ])

    return NextResponse.json({ data: materiales, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener materiales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = materialSchema.parse(body)

    const material = await prisma.material.create({
      data: { ...data, empresa_id: empresaId, created_by: userId },
    })

    return NextResponse.json(material, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear material' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = materialSchema.parse(rest)

    const material = await prisma.material.update({
      where: { id, empresa_id: empresaId },
      data: { ...data, updated_by: userId },
    })
    return NextResponse.json(material)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar material' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.material.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar material' }, { status: 500 })
  }
}
