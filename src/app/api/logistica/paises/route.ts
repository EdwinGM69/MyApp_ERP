import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const paisSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  abreviatura: z.string().min(1, 'La abreviatura es requerida'),
  prefijo_telefonico: z.string().optional().nullable(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const pais = await prisma.pais.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: pais })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const activo = searchParams.get('activo')

    const where: any = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { abreviatura: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {}),
      ...(activo !== null ? { activo: activo === 'true' } : {}),
    }

    const [total, paises] = await Promise.all([
      prisma.pais.count({ where }),
      prisma.pais.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      }),
    ])

    return NextResponse.json({ data: paises, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener países' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    const validatedData = paisSchema.parse(body)

    const pais = await prisma.pais.create({
      data: {
        ...validatedData,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    return NextResponse.json(pais, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if ((err as any).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un país con esa descripción' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el país: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const validatedData = paisSchema.parse(rest)

    const pais = await prisma.pais.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...validatedData,
        updated_by: userId
      },
    })
    return NextResponse.json(pais)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if ((err as any).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un país con esa descripción' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el país' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const body = await req.json()
    const { id } = body

    await prisma.pais.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { activo: false }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al desactivar el país' }, { status: 500 })
  }
}
