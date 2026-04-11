import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tipoSchema = z.object({
  id: z.number().optional(),
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
      const tipo = await prisma.materialTipo.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: tipo })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, tipos] = await Promise.all([
      prisma.materialTipo.count({ where }),
      prisma.materialTipo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: tipos,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (err) {
    console.error('[GET /api/materiales/tipos] Error:', err)
    return NextResponse.json({ error: 'Error al obtener tipos de material' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/materiales/tipos] Body:', body)

    const data = tipoSchema.parse(body)

    // Remove id if present in data for Create operation
    const { id: _, ...createData } = data as any;

    // Validar que no exista un tipo de material con el mismo código o descripción
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.materialTipo.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          },
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un tipo de material con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un tipo de material con esta descripción.' }, { status: 400 })
        }
      }
    }

    const tipo = await prisma.materialTipo.create({
      data: {
        ...createData,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    console.log('[POST /api/materiales/tipos] Success:', tipo)
    return NextResponse.json(tipo, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/materiales/tipos] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de tipo ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Error al crear el tipo de material: ' + (err instanceof Error ? err.message : String(err))
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[PUT /api/materiales/tipos] Body:', body)

    const { id, ...rest } = body
    const data = tipoSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Validar que no exista un tipo de material con el mismo código o descripción
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.materialTipo.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un tipo de material con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un tipo de material con esta descripción.' }, { status: 400 })
        }
      }
    }

    const tipo = await prisma.materialTipo.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })

    console.log('[PUT /api/materiales/tipos] Success:', tipo)
    return NextResponse.json(tipo)
  } catch (err: any) {
    console.error('[PUT /api/materiales/tipos] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de tipo ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Error al actualizar el tipo de material: ' + (err instanceof Error ? err.message : String(err))
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.materialTipo.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: false,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/materiales/tipos] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar el tipo de material' }, { status: 500 })
  }
}
