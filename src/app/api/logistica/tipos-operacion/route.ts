import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tipoOperacionSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  categoria: z.string().min(1, 'La categoría es requerida'),
  afecta_stock: z.boolean(),
  signo_origen: z.string().min(1, 'El signo de origen es requerido'),
  signo_destino: z.string().nullable().optional(),
  requiere_proveedor: z.boolean(),
  requiere_cliente: z.boolean(),
  requiere_suc_destino: z.boolean(),
  permite_precio_costo: z.boolean(),
  actualiza_costo: z.boolean(),
  requiere_aprobacion: z.boolean(),
  requiere_pedido: z.boolean().optional(),
  estado_stock_id: z.number().nullable().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const tipo = await prisma.tipoOperacion.findUnique({
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
          { categoria: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, tipos] = await Promise.all([
      prisma.tipoOperacion.count({ where }),
      prisma.tipoOperacion.findMany({
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
    console.error('[GET /api/logistica/tipos-operacion] Error:', err)
    return NextResponse.json({ error: 'Error al obtener tipos de operación' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = tipoOperacionSchema.parse(body)

    const { id: _, ...createData } = data as any;

    //Validar que no exista otro tipo de operacion con el mismo codigo o descripcion
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.tipoOperacion.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un tipo de operación con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un tipo de operación con esta descripción.' }, { status: 400 })
        }
      }
    }

    const tipo = await prisma.tipoOperacion.create({
      data: {
        ...createData,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    return NextResponse.json(tipo, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/logistica/tipos-operacion] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de tipo de operación ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el tipo de operación' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = tipoOperacionSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Validar que no exista otro tipo de operacion con el mismo codigo o descripcion
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.tipoOperacion.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un tipo de operación con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un tipo de operación con esta descripción.' }, { status: 400 })
        }
      }
    }

    const tipo = await prisma.tipoOperacion.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })

    return NextResponse.json(tipo)
  } catch (err: any) {
    console.error('[PUT /api/logistica/tipos-operacion] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el tipo de operación' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.tipoOperacion.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.tipoOperacion.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/logistica/tipos-operacion] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del tipo de operación' }, { status: 500 })
  }
}
