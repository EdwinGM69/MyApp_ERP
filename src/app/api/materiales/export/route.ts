import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search') ?? ''
    const sucursalId = searchParams.get('sucursalId')

    const where = {
      empresa_id: empresaId,
      ...(search
        ? {
            OR: [
              { descripcion: { contains: search, mode: 'insensitive' as const } },
              { codigo: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const materiales = await prisma.material.findMany({
      where,
      orderBy: { descripcion: 'asc' },
      include: {
        impuesto: { select: { codigo: true, porcentaje: true } },
        marca: { select: { id: true, descripcion: true } },
        categoria_rel: { select: { id: true, descripcion: true } },
        tipo_rel: { select: { id: true, descripcion: true } },
        unidad_medida_rel: { select: { id: true, descripcion: true, abreviatura: true } },
        moneda_precio_compra_rel: { select: { id: true, descripcion: true, abreviatura: true } },
        moneda_costo_promedio_rel: { select: { id: true, descripcion: true, abreviatura: true } },
      },
    })

    const sucursalIdNum = sucursalId ? parseInt(sucursalId) : null
    const ids = materiales.map((m: any) => m.id)

    if (ids.length > 0 && sucursalIdNum) {
      try {
        const rawStock = await prisma.$queryRawUnsafe<any[]>(
          `SELECT material_id, SUM(cantidad)::float as total_stock 
           FROM "StockMaterial" 
           WHERE empresa_id = $1 AND material_id = ANY($2::int[]) AND sucursal_id = $3
           GROUP BY material_id`,
          empresaId,
          ids,
          sucursalIdNum
        )

        const stockMap = new Map(rawStock.map((s: any) => [s.material_id, s.total_stock]))
        materiales.forEach((m: any) => {
          m.stock_actual = stockMap.get(m.id) ?? 0
        })
      } catch {
        materiales.forEach((m: any) => {
          m.stock_actual = 0
        })
      }
    } else {
      materiales.forEach((m: any) => {
        m.stock_actual = 0
      })
    }

    const result = materiales.map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      descripcion: m.descripcion,
      codigo_barras: m.codigo_barras,
      stock_minimo: Number(m.stock_minimo),
      stock_maximo: m.stock_maximo ? Number(m.stock_maximo) : null,
      stock_actual: m.stock_actual,
      costo_promedio: m.costo_promedio ? Number(m.costo_promedio) : null,
      moneda_costo_promedio_id: m.moneda_costo_promedio_id,
      moneda_costo_promedio: m.moneda_costo_promedio_rel?.descripcion || null,
      moneda_precio_compra_id: m.moneda_precio_compra_id,
      moneda_precio_compra: m.moneda_precio_compra_rel?.descripcion || null,
      imagen_url: m.imagen_url,
      nivel_rotacion: m.nivel_rotacion,
      perecible: m.perecible,
      compuesto: m.compuesto,
      marca_id: m.marca_id,
      marca: m.marca?.descripcion || null,
      categoria_id: m.categoria_id,
      categoria: m.categoria_rel?.descripcion || null,
      tipo_id: m.tipo_id,
      tipo: m.tipo_rel?.descripcion || null,
      unidad_medida_id: m.unidad_medida_id,
      unidad_medida: m.unidad_medida_rel?.descripcion || null,
      esquema_id: m.esquema_id,
      stock_lote: m.stock_lote,
      ubicacion_default_id: m.ubicacion_default_id,
      precio_costo: Number(m.precio_costo),
      precio_venta: Number(m.precio_venta),
      activo: m.activo,
      impuesto: m.impuesto ? { codigo: m.impuesto.codigo, porcentaje: m.impuesto.porcentaje } : null,
    }))

    return NextResponse.json({ data: result, total: result.length })
  } catch {
    return NextResponse.json({ error: 'Error al exportar materiales' }, { status: 500 })
  }
}
