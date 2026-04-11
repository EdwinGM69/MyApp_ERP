import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loteSchema = z.object({
  material_id: z.coerce.number(),
  numero_lote: z.string().min(1),
  fecha_fabricacion: z.coerce.date().optional().nullable(),
  fecha_vencimiento: z.coerce.date().optional().nullable(),
  proveedor_id: z.coerce.number().optional().nullable(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const lote = await prisma.lote.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          material: { select: { descripcion: true, codigo: true } },
          proveedor: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: lote })
    }

    const materialId = searchParams.get('materialId')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(materialId ? { material_id: Number(materialId) } : {}),
      ...(search ? { numero_lote: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [total, lotes] = await Promise.all([
      prisma.lote.count({ where }),
      prisma.lote.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          material: { select: { descripcion: true, codigo: true } },
          proveedor: { select: { nombre: true } },
        }
      }),
    ])

    return NextResponse.json({ data: lotes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('[GET /api/lotes] Error:', err)
    return NextResponse.json({ error: 'Error al obtener lotes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = loteSchema.parse(body)

    const lote = await prisma.lote.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(lote, { status: 201 })
  } catch (err) {
    console.error('[POST /api/lotes] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear el lote' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = loteSchema.parse(rest)

    const lote = await prisma.lote.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { 
        ...data, 
      },
    })
    return NextResponse.json(lote)
  } catch (err) {
    console.error('[PUT /api/lotes] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar el lote' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.lote.update({ 
      where: { id: Number(id), empresa_id: empresaId }, 
      data: { activo: false } 
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/lotes] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar el lote' }, { status: 500 })
  }
}
