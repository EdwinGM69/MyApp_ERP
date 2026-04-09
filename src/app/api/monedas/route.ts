import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const monedaSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  abreviatura: z.string().min(1, 'La abreviatura es requerida'),
  simbolo: z.string().min(1, 'El símbolo es requerido'),
  decimal_redondeo: z.number().int().min(0).max(10).optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const moneda = await prisma.moneda.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: moneda })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { descripcion: { contains: search, mode: 'insensitive' as const } },
        { abreviatura: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
    }

    const [total, monedas] = await Promise.all([
      prisma.moneda.count({ where }),
      prisma.moneda.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({ data: monedas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener monedas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    const data = monedaSchema.parse(body)

    const moneda = await prisma.moneda.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(moneda, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear la moneda: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = monedaSchema.parse(rest)

    const moneda = await prisma.moneda.update({
      where: { id, empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId 
      },
    })
    return NextResponse.json(moneda)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar la moneda' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.moneda.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar la moneda' }, { status: 500 })
  }
}
