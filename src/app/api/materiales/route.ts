import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const materialSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  categoria_id: z.coerce.number().optional().nullable(),
  tipo_id: z.coerce.number().optional().nullable(),
  precio_costo: z.coerce.number().min(0),
  precio_venta: z.coerce.number().min(0),
  stock_actual: z.coerce.number().min(0).optional(),
  stock_minimo: z.coerce.number().min(0).optional(),
  imagen_url: z.string().optional().nullable(),
  impuesto_id: z.coerce.number().optional().nullable(),
  activo: z.boolean().optional(),
  marca_id: z.coerce.number().optional().nullable(),
  moneda_precio_compra: z.string().optional().default("USD"),
  moneda_precio_compra_id: z.coerce.number().optional().nullable(),
  moneda_costo_promedio: z.string().optional().default("USD"),
  moneda_costo_promedio_id: z.coerce.number().optional().nullable(),
  costo_promedio: z.coerce.number().optional().nullable(),
  proveedor_id: z.coerce.number().optional().nullable(),
  perecible: z.boolean().optional(),
  compuesto: z.boolean().optional(),
  stock_maximo: z.coerce.number().optional().nullable(),
  nivel_rotacion: z.string().optional().nullable(),
  codigo_mascara: z.string().optional().nullable(),
  codigo_barras: z.string().optional().nullable(),
  unidad_medida_id: z.coerce.number().optional().nullable(),
  esquema_id: z.coerce.number().optional().nullable(),
  ubicacion_default_id: z.coerce.number().optional().nullable(),
  stock_lote: z.boolean().optional(),
  // Relations
  presentaciones: z.array(z.object({
    id: z.number().optional(),
    codigo: z.string(),
    descripcion: z.string(),
    unidad: z.string(),
    activo: z.boolean().optional(),
  })).optional(),
  componentes: z.array(z.object({
    id: z.number().optional(),
    componente_id: z.number(),
    cantidad: z.coerce.number(),
    unidad_medida_id: z.coerce.number().optional().nullable(),
  })).optional(),
  sustitutos: z.array(z.object({
    id: z.number().optional(),
    sustituto_id: z.number(),
  })).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const categoriaId = searchParams.get('categoriaId')
    const tipoId = searchParams.get('tipoId')

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
      ...(categoriaId ? { categoria_id: Number(categoriaId) } : {}),
      ...(tipoId ? { tipo_id: Number(tipoId) } : {}),
    }

    const [total, materiales] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        include: {
          impuesto: { select: { codigo: true, porcentaje: true } },
          marca: { select: { id: true, descripcion: true } },
          categoria_rel: { select: { id: true, descripcion: true } },
          tipo_rel: { select: { id: true, descripcion: true } },
          unidad_medida_rel: { select: { id: true, descripcion: true } },
          moneda_precio_compra_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          moneda_costo_promedio_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } }
        },
      }),
    ])

    // Augment with optional IDs and real-time stock via raw SQL since Prisma client is out of sync
    const ids = materiales.map((m: any) => m.id)
    if (ids.length > 0) {
      try {
        const [rawExtra, rawStock] = await Promise.all([
          prisma.$queryRawUnsafe<any[]>(
            `SELECT id, esquema_id, ubicacion_default_id FROM "Material" WHERE id = ANY($1::int[])`,
            ids
          ),
          prisma.$queryRawUnsafe<any[]>(
            `SELECT material_id, SUM(cantidad)::float as total_stock 
             FROM "StockMaterial" 
             WHERE empresa_id = $1 AND material_id = ANY($2::int[])
             GROUP BY material_id`,
            empresaId,
            ids
          )
        ])

        const extraMap = new Map(rawExtra.map((r: any) => [r.id, { esquema_id: r.esquema_id, ubicacion_default_id: r.ubicacion_default_id }]))
        const stockMap = new Map(rawStock.map((s: any) => [s.material_id, s.total_stock]))

        materiales.forEach((m: any) => {
          const extra = extraMap.get(m.id)
          m.esquema_id = extra?.esquema_id ?? null
          m.ubicacion_default_id = extra?.ubicacion_default_id ?? null
          m.stock_actual = stockMap.get(m.id) ?? 0
          // Mapping unidad_medida for easier UI consumption if needed
          m.unidad_medida = m.unidad_medida_rel?.descripcion || 'und'
        })
      } catch (e) {
        console.error('Error fetching raw data:', e)
      }
    }

    return NextResponse.json({ data: materiales, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener materiales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = materialSchema.parse(body)

    const { presentaciones, componentes, sustitutos, esquema_id, ubicacion_default_id, ...rest } = data

    // Validar que no exista un material con el mismo codigo o nombre
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.material.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          },
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un material con este codigo.' }, { status: 400 })
          } else if (data.descripcion && existente.descripcion?.toLowerCase() === data.descripcion.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un material con esta descripcion.' }, { status: 400 })
          }
        }
      }
    }

    const material = await prisma.material.create({
      data: {
        ...rest,
        stock_maximo: rest.stock_maximo ? Number(rest.stock_maximo) : undefined,
        empresa_id: empresaId,
        created_by: userId,
        presentaciones: presentaciones ? {
          create: presentaciones.map((p: any) => ({ ...p, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined,
        componentes: componentes ? {
          create: componentes.map((c: any) => ({ ...c, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined,
        sustitutos: sustitutos ? {
          create: sustitutos.map((s: any) => ({ ...s, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined
      },
    })

    // Actualizar flag compuesto de material
    const tieneComponentes = await prisma.materialComponente.count({
      where: { material_id: material.id }
    }) > 0

    await prisma.material.update({
      where: { id: material.id },
      data: { compuesto: tieneComponentes }
    })

    // Workaround for Prisma client sync issues: update esquema_id via raw SQL
    if (data.esquema_id !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Material" SET esquema_id = $1 WHERE id = $2`,
        data.esquema_id,
        material.id
      )
    }

    if (data.ubicacion_default_id !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Material" SET ubicacion_default_id = $1 WHERE id = $2`,
        data.ubicacion_default_id,
        material.id
      )
    }

    return NextResponse.json(material, { status: 201 })
  } catch (err: any) {
    console.error('Error creating material:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: `Error al crear material: ${err.message}` }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[PUT /api/materiales] Body:', body)
    const { id, ...rest } = body
    const data = materialSchema.parse(rest)
    console.log('[PUT /api/materiales] Parsed data:', data)

    const { presentaciones, componentes, sustitutos, esquema_id, ubicacion_default_id, ...restData } = data

    // Validar que no exista un material con el mismo codigo o nombre
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.material.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id },
            OR: orConditions,
          },
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un material con este codigo.' }, { status: 400 })
          } else if (data.descripcion && existente.descripcion?.toLowerCase() === data.descripcion.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un material con esta descripcion.' }, { status: 400 })
          }
        }
      }
    }

    const material = await prisma.material.update({
      where: { id, empresa_id: empresaId },
      data: {
        ...restData,
        stock_maximo: restData.stock_maximo ? Number(restData.stock_maximo) : undefined,
        updated_by: userId,
        // For simplicity, we'll deep update by deleting and recreating or updating specifically
        presentaciones: presentaciones ? {
          deleteMany: {},
          create: presentaciones.map((p: any) => ({ ...p, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined,
        componentes: componentes ? {
          deleteMany: {},
          create: componentes.map((c: any) => ({ ...c, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined,
        sustitutos: sustitutos ? {
          deleteMany: {},
          create: sustitutos.map((s: any) => ({ ...s, id: undefined, created_by: userId, updated_by: userId }))
        } : undefined
      },
    })

    // Actualizar flag compuesto de material
    const tieneComponentes = await prisma.materialComponente.count({
      where: { material_id: material.id }
    }) > 0

    await prisma.material.update({
      where: { id: material.id },
      data: { compuesto: tieneComponentes }
    })

    // Workaround for Prisma client sync issues: update esquema_id via raw SQL
    if (data.esquema_id !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Material" SET esquema_id = $1 WHERE id = $2`,
        data.esquema_id,
        id
      )
    }

    if (data.ubicacion_default_id !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Material" SET ubicacion_default_id = $1 WHERE id = $2`,
        data.ubicacion_default_id,
        id
      )
    }

    return NextResponse.json(material)
  } catch (err: any) {
    console.error('Error updating material:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: `Error al actualizar material: ${err.message}` }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.material.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar material' }, { status: 500 })
  }
}
