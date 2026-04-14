import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

/* ─── Validation Schema ─────────────────────────────────────── */
const PromocionSchema = z.object({
  id:               z.number().optional(),
  nombre:           z.string().min(1, 'El nombre es obligatorio'),
  descripcion:      z.string().default(''),
  activo:           z.boolean().default(true),
  fecha_inicio:     z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin:        z.string().min(1, 'La fecha fin es obligatoria'),
  cantidad_compra:  z.coerce.number().int().min(1).default(2),
  cantidad_regalo:  z.coerce.number().int().min(0).default(1),
  detalles: z.array(z.object({
    material_id: z.coerce.number().int().positive(),
  })).default([]),
  canales: z.array(z.object({
    canal: z.string().min(1),
  })).default([]),
  categorias: z.array(z.object({
    categoria_id: z.coerce.number().int().positive(),
  })).default([]),
})

const include = {
  detalles:   { include: { material: { select: { id: true, codigo: true, descripcion: true } } } },
  canales:    true,
  categorias: { include: { categoria: { select: { id: true, codigo: true, descripcion: true } } } },
} as const

/* ─── GET ────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    // Single record by ID
    if (id) {
      const promocion = await prisma.promocion.findFirst({
        where: { id: Number(id), empresa_id: empresaId },
        include,
      })
      if (!promocion) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })
      return NextResponse.json(promocion)
    }

    // Paginated list
    const page     = Math.max(1, parseInt(searchParams.get('page')     || '1'))
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '10'))
    const search   = searchParams.get('search') || ''

    const where: any = {
      empresa_id: empresaId,
      ...(search && {
        OR: [
          { nombre:      { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.promocion.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: { created_at: 'desc' },
        include,
      }),
      prisma.promocion.count({ where }),
    ])

    return NextResponse.json({ data, total, page, pageSize })
  } catch (err: any) {
    console.error('GET /api/precios/promociones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })
  }
}

/* ─── POST ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body   = await req.json()
    const parsed = PromocionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { nombre, descripcion, activo, fecha_inicio, fecha_fin, cantidad_compra, cantidad_regalo, detalles, canales, categorias } = parsed.data

    const promocion = await prisma.promocion.create({
      data: {
        empresa_id:      empresaId,
        nombre,
        descripcion,
        activo,
        fecha_inicio:    new Date(fecha_inicio),
        fecha_fin:       new Date(fecha_fin),
        cantidad_compra,
        cantidad_regalo,
        created_by:      userId,
        updated_by:      userId,
        detalles:   { create: detalles.map(d => ({ material_id: d.material_id })) },
        canales:    { create: canales.map(c => ({ canal: c.canal })) },
        categorias: { create: categorias.map(c => ({ categoria_id: c.categoria_id })) },
      },
      include,
    })

    return NextResponse.json({ data: promocion }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/precios/promociones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una promoción con ese nombre' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 })
  }
}

/* ─── PUT ────────────────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body   = await req.json()
    const parsed = PromocionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { id, nombre, descripcion, activo, fecha_inicio, fecha_fin, cantidad_compra, cantidad_regalo, detalles, canales, categorias } = parsed.data
    if (!id) return NextResponse.json({ error: 'ID es obligatorio para actualizar' }, { status: 400 })

    const existing = await prisma.promocion.findFirst({ where: { id, empresa_id: empresaId } })
    if (!existing) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })

    // Delete and recreate child tables
    await prisma.$transaction([
      prisma.promocionDetalle.deleteMany({   where: { promocion_id: id } }),
      prisma.promocionCanal.deleteMany({     where: { promocion_id: id } }),
      prisma.promocionCategoria.deleteMany({ where: { promocion_id: id } }),
    ])

    const promocion = await prisma.promocion.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        activo,
        fecha_inicio:    new Date(fecha_inicio),
        fecha_fin:       new Date(fecha_fin),
        cantidad_compra,
        cantidad_regalo,
        updated_by:      userId,
        detalles:   { create: detalles.map(d => ({ material_id: d.material_id })) },
        canales:    { create: canales.map(c => ({ canal: c.canal })) },
        categorias: { create: categorias.map(c => ({ categoria_id: c.categoria_id })) },
      },
      include,
    })

    return NextResponse.json({ data: promocion })
  } catch (err: any) {
    console.error('PUT /api/precios/promociones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una promoción con ese nombre' }, { status: 409 })
    return NextResponse.json({ error: 'Error al actualizar promoción' }, { status: 500 })
  }
}

/* ─── DELETE ─────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '0')
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const existing = await prisma.promocion.findFirst({ where: { id, empresa_id: empresaId } })
    if (!existing) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })

    await prisma.promocion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/precios/promociones', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error al eliminar promoción' }, { status: 500 })
  }
}
