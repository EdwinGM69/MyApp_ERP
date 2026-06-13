import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const materialIds = searchParams.get('materialIds')
    const materialId = searchParams.get('materialId')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const where: any = { empresa_id: empresaId }

    if (materialIds) {
      const ids = materialIds.split(',').map(Number).filter(Boolean)
      if (ids.length > 0) where.material_id = { in: ids }
    } else if (materialId) {
      where.material_id = Number(materialId)
    }

    if (fechaDesde || fechaHasta) {
      where.updated_at = {}
      if (fechaDesde) where.updated_at.gte = new Date(fechaDesde + 'T00:00:00')
      if (fechaHasta) where.updated_at.lte = new Date(fechaHasta + 'T23:59:59')
    }

    const [total, historial] = await Promise.all([
      prisma.stockMaterialHistorial.count({ where }),
      prisma.stockMaterialHistorial.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          material: { select: { descripcion: true, codigo: true } },
          sucursal: { select: { descripcion: true } },
          almacen: { select: { descripcion: true } },
          ubicacion: { select: { codigo: true, descripcion: true } },
          estado_stock: { select: { descripcion: true, codigo: true } },
          unidad_medida: { select: { descripcion: true, abreviatura: true } },
        },
        orderBy: { updated_at: 'desc' },
      }),
    ])

    return NextResponse.json({ data: historial, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('[GET /api/stock/historial] Error:', err)
    return NextResponse.json({ error: 'Error al obtener historial de stock' }, { status: 500 })
  }
}
