import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { businessToday, dayRangeUtc } from '@/lib/dates'

function num(v: unknown): number {
  if (v == null) return 0
  const n =
    typeof v === 'object' && v !== null && typeof (v as any).toNumber === 'function'
      ? (v as any).toNumber()
      : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Resumen de alertas de negocio para el centro de notificaciones.
 *
 * Deliberadamente NO reutiliza /api/dashboard: allí se ejecutan 13 consultas
 * agregadas (KPIs, tendencias, últimos movimientos) que son excessive para este
 * propósito y se dispararían en cada sondeo. Aquí solo se cuenta lo que
 * importa y se traen un par de ejemplos para dar contexto al aviso.
 *
 * El cliente compara snapshots consecutivos para avisar solo cuando una alerta
 * aparece, nunca en cada sondeo.
 */
export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const inicioHoy = dayRangeUtc(businessToday()).gte

    const [cajasSinCierre, descuadresTotal, descuadresItems, conteosInventario, stockBajoItems, pendientesTotal, pendientesItems] =
      await Promise.all([
        // Cajas de días anteriores que nunca se cerraron
        prisma.cajaGestion.findMany({
          where: {
            estado: 'Aperturada',
            fecha_apertura: { lt: inicioHoy },
            caja: { empresa_id: empresaId },
          },
          select: {
            id: true,
            fecha_apertura: true,
            caja: { select: { codigo: true, descripcion: true } },
            sucursal: { select: { descripcion: true } },
          },
          orderBy: { fecha_apertura: 'asc' },
          take: 3,
        }),

        // Arqueos con diferencia distinta de cero
        prisma.cajaArqueo.count({
          where: { diferencia: { not: 0 }, gestion: { caja: { empresa_id: empresaId } } },
        }),

        prisma.cajaArqueo.findMany({
          where: { diferencia: { not: 0 }, gestion: { caja: { empresa_id: empresaId } } },
          select: {
            id: true,
            fecha: true,
            diferencia: true,
            gestion: {
              select: {
                caja: { select: { codigo: true, descripcion: true } },
                sucursal: { select: { descripcion: true } },
              },
            },
          },
          orderBy: { fecha: 'desc' },
          take: 2,
        }),

        // Conteos de inventario en una sola pasada (sin joins con ventas)
        prisma.$queryRaw<
          Array<{ stock_bajo: number; agotados: number; total_activos: number }>
        >`
          SELECT
            COUNT(*) FILTER (WHERE stock_minimo > 0 AND stock_actual < stock_minimo) AS stock_bajo,
            COUNT(*) FILTER (WHERE stock_actual <= 0 AND stock_minimo > 0) AS agotados,
            COUNT(*) AS total_activos
          FROM "Material"
          WHERE empresa_id = ${empresaId} AND activo = true
        `,

        prisma.$queryRaw<
          Array<{ codigo: string; descripcion: string; stock_actual: number; stock_minimo: number }>
        >`
          SELECT codigo, descripcion, stock_actual, stock_minimo
          FROM "Material"
          WHERE empresa_id = ${empresaId}
            AND activo = true
            AND stock_minimo > 0
            AND stock_actual < stock_minimo
          ORDER BY (stock_actual - stock_minimo) ASC
          LIMIT 3
        `,

        // Documentos pendientes de confirmar
        prisma.venta.count({ where: { empresa_id: empresaId, estado: 'cotizacion' } }),

        prisma.venta.findMany({
          where: { empresa_id: empresaId, estado: 'cotizacion' },
          select: {
            id: true,
            numero_pedido: true,
            fecha_venta: true,
            cliente: { select: { nombre: true } },
          },
          orderBy: { fecha_venta: 'desc' },
          take: 2,
        }),
      ])

    const inventario = conteosInventario[0]
    const stockBajo = Number(inventario?.stock_bajo ?? 0) || 0
    const agotados = Number(inventario?.agotados ?? 0) || 0

    const alertas: Record<string, unknown> = {}

    if (cajasSinCierre.length > 0) {
      alertas.cajasSinCierre = {
        total: cajasSinCierre.length,
        items: cajasSinCierre.map((c) => ({
          caja: `${c.caja.codigo} · ${c.caja.descripcion}`,
          sucursal: c.sucursal.descripcion,
          fecha: c.fecha_apertura.toISOString(),
        })),
      }
    }

    if (descuadresTotal > 0) {
      alertas.descuadres = {
        total: descuadresTotal,
        items: descuadresItems.map((a) => ({
          caja: `${a.gestion.caja.codigo} · ${a.gestion.caja.descripcion}`,
          sucursal: a.gestion.sucursal.descripcion,
          diferencia: num(a.diferencia),
          fecha: a.fecha.toISOString(),
        })),
      }
    }

    if (agotados > 0) {
      alertas.materialesAgotados = { total: agotados }
    }

    if (stockBajo > 0) {
      alertas.stockBajo = {
        total: stockBajo,
        items: stockBajoItems.map((m) => ({
          codigo: m.codigo,
          descripcion: m.descripcion,
          stock: num(m.stock_actual),
          minimo: num(m.stock_minimo),
        })),
      }
    }

    if (pendientesTotal > 0) {
      alertas.documentosPendientes = {
        total: pendientesTotal,
        items: pendientesItems.map((v) => ({
          numero: v.numero_pedido,
          cliente: v.cliente?.nombre ?? '',
          fecha: v.fecha_venta.toISOString(),
        })),
      }
    }

    return NextResponse.json({ data: alertas })
  } catch (err) {
    console.error('[GET /api/notificaciones/alertas] Error:', err)
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 })
  }
}
