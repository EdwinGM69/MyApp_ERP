import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tipoCondicionSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const tipo = await prisma.tipoCondicion.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          empresa: { select: { nombre: true } }
        }
      })
      return NextResponse.json({ data: tipo })
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

    const [total, tipos] = await Promise.all([
      prisma.tipoCondicion.count({ where }),
      prisma.tipoCondicion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({ data: tipos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener tipos de condición' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    const data = tipoCondicionSchema.parse(body)

    const existing = await prisma.tipoCondicion.findFirst({
      where: { empresa_id: empresaId, codigo: { equals: data.codigo, mode: 'insensitive' } }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un Tipo de Condición con el mismo código' }, { status: 400 })
    }

    const tipo = await prisma.tipoCondicion.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(tipo, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear el tipo de condición: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = tipoCondicionSchema.parse(rest)

    if (data.codigo) {
      const existing = await prisma.tipoCondicion.findFirst({
        where: { empresa_id: empresaId, NOT: { id }, codigo: { equals: data.codigo, mode: 'insensitive' } }
      })
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un Tipo de Condición con el mismo código' }, { status: 400 })
      }
    }

    const tipo = await prisma.tipoCondicion.update({
      where: { id, empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId 
      },
    })
    return NextResponse.json(tipo)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar el tipo de condición' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.tipoCondicion.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar el tipo de condición' }, { status: 500 })
  }
}
