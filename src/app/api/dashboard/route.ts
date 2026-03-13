import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      inventarioValue,
      ventasMes,
      ventasDia,
      topProductos,
      ventasSemestre,
      ventasRecientes,
    ] = await Promise.all([
      // Valor inventario
      prisma.material.aggregate({
        where: { empresa_id: empresaId, activo: true },
        _sum: { precio_costo: true },
      }),

      // Ventas mes
      prisma.venta.aggregate({
        where: { empresa_id: empresaId, estado: 'procesada', fecha_venta: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),

      // Ventas día
      prisma.venta.aggregate({
        where: { empresa_id: empresaId, estado: 'procesada', fecha_venta: { gte: startOfDay } },
        _sum: { total: true },
        _count: true,
      }),

      // Top 5 productos
      prisma.ventaDetalle.groupBy({
        by: ['material_id'],
        where: { venta: { empresa_id: empresaId, estado: 'procesada' } },
        _sum: { subtotal: true, cantidad: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),

      // Ventas últimos 6 meses
      prisma.$queryRaw<Array<{ mes: string; total: number }>>`
        SELECT TO_CHAR(fecha_venta, 'Mon') as mes,
               SUM(total) as total
        FROM "Venta"
        WHERE empresa_id = ${empresaId}
          AND estado = 'procesada'
          AND fecha_venta >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha_venta), TO_CHAR(fecha_venta, 'Mon')
        ORDER BY DATE_TRUNC('month', fecha_venta)
      `,

      // Ventas recientes del día
      prisma.venta.findMany({
        where: { empresa_id: empresaId, fecha_venta: { gte: startOfDay } },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fecha_venta: 'desc' },
        take: 10,
      }),
    ])

    // Hydrate top productos with material info
    const materialesIds = topProductos.map((t) => t.material_id)
    const materiales = await prisma.material.findMany({
      where: { id: { in: materialesIds } },
      select: { id: true, descripcion: true, imagen_url: true },
    })
    const materialesMap = Object.fromEntries(materiales.map((m) => [m.id, m]))

    return NextResponse.json({
      inventarioValue: inventarioValue._sum.precio_costo ?? 0,
      ventasMes: { total: ventasMes._sum.total ?? 0, count: ventasMes._count },
      ventasDia: { total: ventasDia._sum.total ?? 0, count: ventasDia._count },
      topProductos: topProductos.map((t) => ({
        material: materialesMap[t.material_id],
        total: t._sum.subtotal ?? 0,
        cantidad: t._sum.cantidad ?? 0,
      })),
      ventasSemestre,
      ventasRecientes: ventasRecientes.map((v) => ({
        id: v.id,
        numero_pedido: v.numero_pedido,
        cliente: v.cliente?.nombre ?? 'Sin cliente',
        total: v.total,
        estado: v.estado,
        fecha_venta: v.fecha_venta,
      })),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al cargar dashboard' }, { status: 500 })
  }
}
