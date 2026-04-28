import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function getParametroPrecioVenta(empresaId: number, userId: number): Promise<string | null> {
  try {
    console.log('[POS] getParametroPrecioVenta empresaId:', empresaId, 'userId:', userId)
    
    // Debug: ver todos los parametros para esta empresa
    const allParams = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, codigo, nivel, tipo_dato, valor_string, empresa_id, created_by, activo
      FROM "ParametroSistema" 
      WHERE empresa_id = $1 OR empresa_id IS NULL
      LIMIT 20
    `, empresaId)
    console.log('[POS] All parametros for empresa:', JSON.stringify(allParams))
    
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        p.tipo_dato,
        p.nivel,
        CASE p.tipo_dato
          WHEN 'STRING' THEN p.valor_string
          WHEN 'NUMBER' THEN p.valor_number::TEXT
          WHEN 'BOOLEAN' THEN p.valor_boolean::TEXT
          WHEN 'DATE' THEN p.valor_date::TEXT
          WHEN 'JSON' THEN p.valor_json::TEXT
          ELSE COALESCE(p.valor_string, p.valor_number::TEXT)
        END AS valor
      FROM "ParametroSistema" p
      WHERE
        p.codigo = 'POS.PREVTA'
        AND p.activo = true
        AND (
          (p.nivel = 'USUARIO' AND p.empresa_id = $1 AND p.created_by = $2)
          OR (p.nivel = 'EMPRESA' AND p.empresa_id = $1)
          OR (p.nivel = 'MODULO' AND p.empresa_id IS NULL)
          OR (p.nivel = 'SISTEMA' AND p.empresa_id IS NULL)
        )
      ORDER BY
        CASE p.nivel
          WHEN 'USUARIO' THEN 1
          WHEN 'EMPRESA' THEN 2
          WHEN 'MODULO' THEN 3
          WHEN 'SISTEMA' THEN 4
        END
      LIMIT 1
    `, empresaId, userId)
    console.log('[POS] POS.PREVTA parametro result:', JSON.stringify(result))
    if (!result || result.length === 0) {
      console.log('[POS] No parametro found for POS.PREVTA')
      return null
    }
    return result[0]?.valor ?? null
  } catch (e) {
    console.error('[POS] Error getting parametro precio venta:', e)
    return null
  }
}

async function getDynamicPrice(
  empresaId: number,
  materialId: number,
  monedaId: number,
  tipoCondicionCodigo: string
): Promise<number | null> {
  try {
    console.log('[POS] getDynamicPrice params:', { empresaId, materialId, monedaId, tipoCondicionCodigo })
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.valor
      FROM "Condicion" c
      JOIN "TipoCondicion" tc ON tc.id = c.tipo_condicion_id
      WHERE tc.empresa_id = $1
        AND tc.codigo = $2
        AND c.moneda_id = $3
        AND c.activo = true
        AND c.fecha_desde <= NOW()
        AND (c.fecha_hasta IS NULL OR c.fecha_hasta >= NOW())
        AND (c.material_id = $4 OR c.material_id IS NULL)
      ORDER BY c.material_id DESC NULLS LAST, c.fecha_desde DESC
      LIMIT 1
    `, empresaId, tipoCondicionCodigo, monedaId, materialId)
    console.log('[POS] getDynamicPrice result:', result)
    return result[0]?.valor ? Number(result[0].valor) : null
  } catch (e) {
    console.error('Error getting dynamic price:', e)
    return null
  }
}

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
    unidad_medida_id: z.number(),
    unidad_control: z.boolean().optional(),
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
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const categoriaId = searchParams.get('categoriaId')
    const tipoId = searchParams.get('tipoId')
    const sucursalId = searchParams.get('sucursalId')

    let estadoStockId: number | null = null
    console.log('[materiales API] Starting stock logic, empresaId:', empresaId)
    try {
      // Step 1 & 2: Get ParametroSistema records for POS.PEDVTA
      // Filter by empresa_id if present, or get all without empresa_id
      const paramResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, nivel, tipo_dato, valor_string, valor_number, valor_boolean, valor_date, valor_json, empresa_id
        FROM "ParametroSistema"
        WHERE codigo = 'POS.PEDVTA' AND activo = true
          AND (empresa_id = $1 OR empresa_id IS NULL)
        ORDER BY 
          CASE 
            WHEN nivel = 'USUARIO' THEN 1
            WHEN nivel = 'EMPRESA' THEN 2
            WHEN nivel = 'MODULO' THEN 3
            WHEN nivel = 'SISTEMA' THEN 4
            ELSE 5
          END
        LIMIT 1
      `, empresaId)

      console.log('[materiales API] POS.PEDVTA param result:', paramResult)

      if (paramResult && paramResult.length > 0) {
        const param = paramResult[0]
        
        // Step 3: Get the value based on tipo_dato
        let clasePedidoCodigo: string | number | boolean | null = null
        
        switch (param.tipo_dato) {
          case 'STRING':
            clasePedidoCodigo = param.valor_string
            break
          case 'NUMBER':
            clasePedidoCodigo = param.valor_number
            break
          case 'BOOLEAN':
            clasePedidoCodigo = param.valor_boolean
            break
          case 'DATE':
            clasePedidoCodigo = param.valor_date
            break
          case 'JSON':
            clasePedidoCodigo = param.valor_json
            break
        }

        console.log('[materiales API] clasePedidoCodigo:', clasePedidoCodigo, 'type:', param.tipo_dato)

        // Step 4: Find the ClasePedido and get estado_stock_id
        if (clasePedidoCodigo) {
          // Determine if the code is numeric (ID) or string (codigo)
          const isNumeric = !isNaN(Number(clasePedidoCodigo))
          
          let clasePedido: any = null
          
          if (isNumeric) {
            // Search by ID
            clasePedido = await prisma.clasePedido.findFirst({
              where: { 
                id: Number(clasePedidoCodigo),
                empresa_id: empresaId
              },
              select: { estado_stock_id: true }
            })
          } else {
            // Search by codigo
            clasePedido = await prisma.clasePedido.findFirst({
              where: { 
                codigo: String(clasePedidoCodigo),
                empresa_id: empresaId
              },
              select: { estado_stock_id: true }
            })
          }
          
          estadoStockId = clasePedido?.estado_stock_id ?? null
          console.log('[materiales API] clasePedido found:', clasePedido, 'estado_stock_id:', estadoStockId)
        }
      }
    } catch (e) {
      console.error('[materiales API] Error getting POS.PEDVTA param:', e)
    }
    console.log('[materiales API] final estadoStockId:', estadoStockId)

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
          unidad_medida_rel: { select: { id: true, descripcion: true, abreviatura: true } },
          moneda_precio_compra_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          moneda_costo_promedio_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } }
        },
      }),
    ])

    // Augment with optional IDs and real-time stock via raw SQL since Prisma client is out of sync
    const ids = materiales.map((m: any) => m.id)
    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : null
    console.log('[materiales API] Fetching stock - empresaId:', empresaId, 'sucursalId:', sucursalId, 'parsed:', sucursalIdNum, 'estadoStockId:', estadoStockId)
    
    if (ids.length > 0 && sucursalIdNum) {
      try {
        let stockQuery: string
        const queryParams: any[] = [empresaId, ids, sucursalIdNum]
        
        if (estadoStockId) {
          // Consulta por estado específico
          stockQuery = `
            SELECT material_id, SUM(cantidad)::float as total_stock 
            FROM "StockMaterial" 
            WHERE empresa_id = $1 AND material_id = ANY($2::int[]) AND sucursal_id = $3 AND estado_stock_id = $4
            GROUP BY material_id`
          queryParams.push(estadoStockId)
        } else {
          // Consulta por todos los estados (catálogo de materiales y POS)
          stockQuery = `
            SELECT material_id, SUM(cantidad)::float as total_stock 
            FROM "StockMaterial" 
            WHERE empresa_id = $1 AND material_id = ANY($2::int[]) AND sucursal_id = $3
            GROUP BY material_id`
        }
        
        const rawStock = await prisma.$queryRawUnsafe<any[]>(stockQuery, ...queryParams)
        console.log('[materiales API] Stock query result for sucursal', sucursalIdNum, ':', rawStock)

        const stockMap = new Map(rawStock.map((s: any) => [s.material_id, s.total_stock]))

        materiales.forEach((m: any) => {
          m.stock_actual = stockMap.get(m.id) ?? 0
          m.unidad_medida = m.unidad_medida_rel?.descripcion || 'und'
          m.unidad_medida_id = m.unidad_medida_rel?.id || 1
        })
      } catch (e) {
        console.error('Error fetching raw data:', e)
        materiales.forEach((m: any) => {
          m.stock_actual = 0
          m.unidad_medida = m.unidad_medida_rel?.descripcion || 'und'
          m.unidad_medida_id = m.unidad_medida_rel?.id || 1
        })
      }
    } else {
      // No sucursalId configured, set stock to 0
      console.log('[materiales API] No stock query - sucursalIdNum:', sucursalIdNum)
      materiales.forEach((m: any) => {
        m.stock_actual = 0
        m.unidad_medida = m.unidad_medida_rel?.descripcion || 'und'
        m.unidad_medida_id = m.unidad_medida_rel?.id || 1
      })
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
