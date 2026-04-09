import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tipoCambioFuenteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  api_url: z.string().url().optional().or(z.literal('')),
  proveedor: z.string().optional(),
  prioridad: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const fuente = await prisma.tipoCambioFuente.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: fuente })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { nombre: { contains: search, mode: 'insensitive' as const } },
        { proveedor: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
    }

    const [total, fuentes] = await Promise.all([
      prisma.tipoCambioFuente.count({ where }),
      prisma.tipoCambioFuente.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { prioridad: 'asc' },
      }),
    ])

    return NextResponse.json({ data: fuentes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('Error fetching tipo cambio fuente:', err)
    return NextResponse.json({ error: 'Error al obtener fuentes de tipo de cambio' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    const data = tipoCambioFuenteSchema.parse(body)

    const fuente = await prisma.tipoCambioFuente.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(fuente, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('Error creating tipo cambio fuente:', err)
    return NextResponse.json({ error: 'Error al crear la fuente: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = tipoCambioFuenteSchema.parse(rest)

    const fuente = await prisma.tipoCambioFuente.update({
      where: { id, empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId 
      },
    })
    return NextResponse.json(fuente)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('Error updating tipo cambio fuente:', err)
    return NextResponse.json({ error: 'Error al actualizar la fuente' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.tipoCambioFuente.update({ 
      where: { id, empresa_id: empresaId }, 
      data: { activo: false } 
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error deleting tipo cambio fuente:', err)
    return NextResponse.json({ error: 'Error al desactivar la fuente' }, { status: 500 })
  }
}