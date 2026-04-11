import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const categoriaSchema = z.object({
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
      const categoria = await prisma.materialCategoria.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: categoria })
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

    const [total, categorias] = await Promise.all([
      prisma.materialCategoria.count({ where }),
      prisma.materialCategoria.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: categorias,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (err) {
    console.error('[GET /api/materiales/categorias] Error:', err)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/materiales/categorias] Body:', body)

    const data = categoriaSchema.parse(body)

    // Validar que no exista una categoria con el mismo código o descripción
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.materialCategoria.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          },
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una categoría con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una categoría con esta descripción.' }, { status: 400 })
        }
      }
    }

    // Remove id if present in data for Create operation
    const { id: _, ...createData } = data as any;

    const categoria = await prisma.materialCategoria.create({
      data: {
        ...createData,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    console.log('[POST /api/materiales/categorias] Success:', categoria)
    return NextResponse.json(categoria, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/materiales/categorias] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de categoría ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Error al crear la categoría: ' + (err instanceof Error ? err.message : String(err))
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[PUT /api/materiales/categorias] Body:', body)

    const { id, ...rest } = body
    const data = categoriaSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.materialCategoria.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una categoría con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una categoría con esta descripción.' }, { status: 400 })
        }
      }
    }
    const categoria = await prisma.materialCategoria.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })

    console.log('[PUT /api/materiales/categorias] Success:', categoria)
    return NextResponse.json(categoria)
  } catch (err: any) {
    console.error('[PUT /api/materiales/categorias] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de categoría ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Error al actualizar la categoría: ' + (err instanceof Error ? err.message : String(err))
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.materialCategoria.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: false,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/materiales/categorias] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar la categoría' }, { status: 500 })
  }
}
