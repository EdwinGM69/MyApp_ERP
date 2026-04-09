import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const estadoStockSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const estado = await prisma.estadoStock.findUnique({
        where: { id: Number(id), empresa_id: empresaId }
      })
      return NextResponse.json({ data: estado })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { descripcion: { contains: search, mode: 'insensitive' as const } },
        { codigo: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
    }

    const [total, estados] = await Promise.all([
      prisma.estadoStock.count({ where }),
      prisma.estadoStock.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' }
      }),
    ])

    return NextResponse.json({ data: estados, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('[GET /api/estados-stock] Error:', err)
    return NextResponse.json({ error: 'Error al obtener estados de stock' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = estadoStockSchema.parse(body)

    const estado = await prisma.estadoStock.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(estado, { status: 201 })
  } catch (err) {
    console.error('[POST /api/estados-stock] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear el estado de stock' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = estadoStockSchema.parse(rest)

    const estado = await prisma.estadoStock.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId 
      },
    })
    return NextResponse.json(estado)
  } catch (err) {
    console.error('[PUT /api/estados-stock] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar el estado de stock' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.estadoStock.update({ 
      where: { id: Number(id), empresa_id: empresaId }, 
      data: { activo: false } 
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/estados-stock] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar el estado de stock' }, { status: 500 })
  }
}
