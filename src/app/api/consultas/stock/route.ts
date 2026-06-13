import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const tipo = searchParams.get('tipo') || 'stock'
    const materialIds = searchParams.get('materialIds')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const skip = (page - 1) * pageSize

    const materialFilter = materialIds
      ? materialIds.split(',').map(Number).filter(Boolean)
      : []

    if (tipo === 'historial') {
      const where: any = { empresa_id: empresaId }
      if (materialFilter.length > 0) where.material_id = { in: materialFilter }
      if (fechaDesde || fechaHasta) {
        where.updated_at = {}
        if (fechaDesde) where.updated_at.gte = new Date(fechaDesde + 'T00:00:00')
        if (fechaHasta) where.updated_at.lte = new Date(fechaHasta + 'T23:59:59')
      }

      const [data, total] = await Promise.all([
        prisma.stockMaterialHistorial.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            material: { select: { codigo: true, descripcion: true } },
            sucursal: { select: { descripcion: true } },
            almacen: { select: { descripcion: true } },
            ubicacion: { select: { codigo: true, descripcion: true } },
            estado_stock: { select: { codigo: true, descripcion: true } },
            unidad_medida: { select: { descripcion: true, abreviatura: true } },
          },
          orderBy: { updated_at: 'desc' },
        }),
        prisma.stockMaterialHistorial.count({ where }),
      ])

      return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    }

    const where: any = { empresa_id: empresaId }
    if (materialFilter.length > 0) where.material_id = { in: materialFilter }

    const [estadosStock, stockRecords] = await Promise.all([
      prisma.estadoStock.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, codigo: true, descripcion: true },
        orderBy: { codigo: 'asc' },
      }),
      prisma.stockMaterial.findMany({
        where,
        include: {
          material: { select: { codigo: true, descripcion: true } },
          almacen: { select: { descripcion: true } },
          ubicacion: { select: { codigo: true, descripcion: true } },
          estado_stock: { select: { id: true, codigo: true, descripcion: true } },
          unidad_medida: { select: { descripcion: true, abreviatura: true } },
        },
      }),
    ])

    const allMaterialIds = [...new Set(stockRecords.map((r) => r.material_id))]
    const lastMovementsMap = new Map<number, string>()

    if (allMaterialIds.length > 0) {
      const aggs = await prisma.stockMaterialHistorial.groupBy({
        by: ['material_id'],
        _max: { updated_at: true },
        where: { empresa_id: empresaId, material_id: { in: allMaterialIds } },
      })
      aggs.forEach((a) => {
        if (a._max.updated_at) lastMovementsMap.set(a.material_id, a._max.updated_at.toISOString())
      })
    }

    interface GroupKey {
      material_id: number
      material: { codigo: string; descripcion: string }
      almacen_id: number
      almacen: { descripcion: string }
    }

    interface StockPorEstado {
      [estadoId: string]: { id: number; codigo: string; descripcion: string; cantidad: number }
    }

    interface DetalleRecord {
      numero_lote: string | null
      ubicacion: { codigo: string; descripcion: string } | null
      estado_stock: { id: number; codigo: string; descripcion: string }
      cantidad: number
      unidad_medida: { descripcion: string; abreviatura: string } | null
    }

    const groups = new Map<string, {
      key: GroupKey
      stockPorEstado: StockPorEstado
      detalles: DetalleRecord[]
    }>()

    for (const rec of stockRecords) {
      const groupId = `${rec.material_id}_${rec.almacen_id}`
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          key: {
            material_id: rec.material_id,
            material: rec.material,
            almacen_id: rec.almacen_id,
            almacen: rec.almacen,
          },
          stockPorEstado: {},
          detalles: [],
        })
      }
      const group = groups.get(groupId)!

      const esId = rec.estado_stock.id
      const currentCant = group.stockPorEstado[esId]
      group.stockPorEstado[esId] = {
        id: esId,
        codigo: rec.estado_stock.codigo,
        descripcion: rec.estado_stock.descripcion,
        cantidad: (currentCant?.cantidad ?? 0) + Number(rec.cantidad),
      }

      group.detalles.push({
        numero_lote: rec.numero_lote,
        ubicacion: rec.ubicacion ? { codigo: rec.ubicacion.codigo, descripcion: rec.ubicacion.descripcion } : null,
        estado_stock: { id: rec.estado_stock.id, codigo: rec.estado_stock.codigo, descripcion: rec.estado_stock.descripcion },
        cantidad: Number(rec.cantidad),
        unidad_medida: rec.unidad_medida,
      })
    }

    const allGroups = Array.from(groups.values()).map((g) => ({
      material_id: g.key.material_id,
      material: g.key.material,
      almacen_id: g.key.almacen_id,
      almacen: g.key.almacen,
      stock_por_estado: g.stockPorEstado,
      ultimo_movimiento: lastMovementsMap.get(g.key.material_id) ?? null,
      detalles: g.detalles,
    }))

    const total = allGroups.length
    const groupedData = allGroups.slice(skip, skip + pageSize)

    return NextResponse.json({
      data: groupedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      estadosStock,
    })
  } catch (err: any) {
    console.error('[GET /api/consultas/stock] Error:', err)
    return NextResponse.json({ error: 'Error al consultar stock' }, { status: 500 })
  }
}
