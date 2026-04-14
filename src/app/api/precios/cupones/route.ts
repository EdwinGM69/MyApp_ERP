import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const CuponSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().default(''),
  tipo: z.enum(['PORCENTAJE', 'MONTO FIJO']),
  valor: z.coerce.number().min(0),
  moneda_id: z.coerce.number().int().positive(),
  ilimitado: z.boolean().default(true),
  limite_uso: z.coerce.number().int().min(0).nullable().optional(),
  acumulable: z.boolean().default(false),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin: z.string().min(1, 'La fecha fin es obligatoria'),
  activo: z.boolean().default(true),
  detalles: z.array(z.object({
    material_id: z.coerce.number().int().positive(),
  })).default([]),
  categorias: z.array(z.object({
    categoria_id: z.coerce.number().int().positive(),
  })).default([]),
})

const include = {
  detalles: { include: { material: { select: { id: true, codigo: true, descripcion: true, precio_venta: true } } } },
  cupones: { include: { categoria: { select: { id: true, codigo: true, descripcion: true } } } },
  moneda: { select: { id: true, abreviatura: true, descripcion: true, simbolo: true } },
} as const

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const cupon = await prisma.cupon.findFirst({
        where: { id: Number(id), empresa_id: empresaId },
        include,
      })
      if (!cupon) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })
      return NextResponse.json(cupon)
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '10'))
    const search = searchParams.get('search') || ''

    const where: any = {
      empresa_id: empresaId,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.cupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include,
      }),
      prisma.cupon.count({ where }),
    ])

    return NextResponse.json({ data, total, page, pageSize })
  } catch (err: any) {
    console.error('GET /api/precios/cupones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const parsed = CuponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { nombre, descripcion, tipo, valor, moneda_id, ilimitado, limite_uso, acumulable, fecha_inicio, fecha_fin, activo, detalles, categorias } = parsed.data

    const cupon = await prisma.cupon.create({
      data: {
        empresa_id: empresaId,
        nombre,
        descripcion,
        tipo,
        valor,
        moneda_id,
        ilimitado,
        limite_uso: ilimitado ? null : (limite_uso ?? 0),
        acumulable,
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin: new Date(fecha_fin),
        activo,
        created_by: userId,
        updated_by: userId,
        detalles: { create: detalles.map(d => ({ material_id: d.material_id })) },
        cupones: { create: categorias.map(c => ({ categoria_id: c.categoria_id })) },
      },
      include,
    })

    return NextResponse.json({ data: cupon }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/precios/cupones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe un cupón con ese nombre' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear cupón' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const parsed = CuponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { id, nombre, descripcion, tipo, valor, moneda_id, ilimitado, limite_uso, acumulable, fecha_inicio, fecha_fin, activo, detalles, categorias } = parsed.data
    if (!id) return NextResponse.json({ error: 'ID es obligatorio para actualizar' }, { status: 400 })

    const existing = await prisma.cupon.findFirst({ where: { id, empresa_id: empresaId } })
    if (!existing) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })

    await prisma.$transaction([
      prisma.cuponDetalle.deleteMany({ where: { cupon_id: id } }),
      prisma.cuponCategoria.deleteMany({ where: { cupon_id: id } }),
    ])

    const cupon = await prisma.cupon.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        tipo,
        valor,
        moneda_id,
        ilimitado,
        limite_uso: ilimitado ? null : (limite_uso ?? 0),
        acumulable,
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin: new Date(fecha_fin),
        activo,
        updated_by: userId,
        detalles: { create: detalles.map(d => ({ material_id: d.material_id })) },
        cupones: { create: categorias.map(c => ({ categoria_id: c.categoria_id })) },
      },
      include,
    })

    return NextResponse.json({ data: cupon })
  } catch (err: any) {
    console.error('PUT /api/precios/cupones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe un cupón con ese nombre' }, { status: 409 })
    return NextResponse.json({ error: 'Error al actualizar cupón' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '0')
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const existing = await prisma.cupon.findFirst({ where: { id, empresa_id: empresaId } })
    if (!existing) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })

    await prisma.cupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/precios/cupones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error al eliminar cupón' }, { status: 500 })
  }
}