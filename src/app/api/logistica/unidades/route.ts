import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const unidadSchema = z.object({
  id: z.number().optional(),
  descripcion: z.string().min(1),
  abreviatura: z.string().min(1),
  unidad_multiplo: z.number().min(0.01),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const unidad = await prisma.unidadMedida.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        select: {
          id: true,
          descripcion: true,
          abreviatura: true,
          unidad_multiplo: true,
          activo: true,
          created_at: true,
          updated_at: true,
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: unidad })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { abreviatura: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, unidades] = await Promise.all([
      prisma.unidadMedida.count({ where }),
      prisma.unidadMedida.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        select: {
          id: true,
          descripcion: true,
          abreviatura: true,
          unidad_multiplo: true,
          activo: true,
          created_at: true,
          updated_at: true,
        }
      }),
    ])

    return NextResponse.json({
      data: unidades,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (err) {
    console.error('[GET /api/logistica/unidades] Error:', err)
    return NextResponse.json({ error: 'Error al obtener unidades de medida' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    const data = unidadSchema.parse(body)
    const { id: _, ...createData } = data as any;

    // Validar que no exista otra unidad de medida con la misma abreviatura o descripción
    if (data.abreviatura || data.descripcion) {
      const orConditions = []
      if (data.abreviatura) orConditions.push({ abreviatura: { equals: data.abreviatura, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.unidadMedida.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.abreviatura && existente.abreviatura?.toLowerCase() === data.abreviatura.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una unidad de medida con esta abreviatura.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una unidad de medida con esta descripción.' }, { status: 400 })
        }
      }
    }

    const unidad = await prisma.unidadMedida.create({
      data: {
        ...createData,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    return NextResponse.json(unidad, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/logistica/unidades] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'La abreviatura ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear la unidad de medida' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    const { id, ...rest } = body
    const data = unidadSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Validar que no exista otra unidad de medida con la misma abreviatura o descripción
    if (data.abreviatura || data.descripcion) {
      const orConditions = []
      if (data.abreviatura) orConditions.push({ abreviatura: { equals: data.abreviatura, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.unidadMedida.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.abreviatura && existente.abreviatura?.toLowerCase() === data.abreviatura.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una unidad de medida con esta abreviatura.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una unidad de medida con esta descripción.' }, { status: 400 })
        }
      }
    }

    const unidad = await prisma.unidadMedida.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })

    return NextResponse.json(unidad)
  } catch (err: any) {
    console.error('[PUT /api/logistica/unidades] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'La abreviatura ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar la unidad de medida' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.unidadMedida.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: false,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/logistica/unidades] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar la unidad de medida' }, { status: 500 })
  }
}
