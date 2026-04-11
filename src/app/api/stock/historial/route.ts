import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const materialId = searchParams.get('materialId')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const where = {
      empresa_id: empresaId,
      ...(materialId ? { material_id: Number(materialId) } : {}),
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
