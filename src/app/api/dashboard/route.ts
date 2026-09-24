import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { businessToday, dayRangeUtc } from '@/lib/dates'

function num(v: any): number {
  if (v == null) return 0
  const n = typeof v === 'object' && typeof v.toNumber === 'function' ? v.toNumber() : Number(v)
  return Number.isFinite(n) ? n : 0
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Redondea a 1 decimal los días restantes estimados; null si no hay ventas registradas.
function diasRestantes(stock: number, qty7d: number): number | null {
  const velocidad = qty7d / 7
  if (velocidad <= 0) return null
  const dias = stock / velocidad
  return Math.round(dias * 10) / 10
}

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const today = businessToday()
    const todayRange = dayRangeUtc(today)

    const [y, m, d] = today.split('-').map(Number)
    const lastWeekDate = new Date(Date.UTC(y, m - 1, d - 7))
    const lastWeekRange = dayRangeUtc(dateStr(lastWeekDate))

    const [
      ventasDia,
      ventasDiaSemanaPasada,
      clientesAtendidos,
      margenBrutoRaw,
      openSessions,
      descuadres,
      stockRaw,
      cotizaciones,
      cotizacionesCount,
      ventasDiarias,
      categoriasVendidas,
    ] = await Promise.all([
      // Ventas del día
      prisma.venta.aggregate({
        where: { empresa_id: empresaId, estado: 'procesada', fecha_venta: todayRange },
        _sum: { total: true },
        _count: true,
      }),

      // Ventas mismo día de la semana anterior (para variación %)
      prisma.venta.aggregate({
        where: { empresa_id: empresaId, estado: 'procesada', fecha_venta: lastWeekRange },
        _sum: { total: true },
      }),

      // Clientes atendidos hoy (distintos)
      prisma.venta.groupBy({
        by: ['cliente_id'],
        where: { empresa_id: empresaId, estado: 'procesada', fecha_venta: todayRange },
      }),

      // Margen bruto estimado del día (precio_venta - costo) * cantidad
      prisma.$queryRaw<Array<{ margen: number }>>`
        SELECT COALESCE(SUM((vd.precio_unit - m.precio_costo) * vd.cantidad), 0) AS margen
        FROM "VentaDetalle" vd
        JOIN "Venta" v ON vd.venta_id = v.id
        JOIN "Material" m ON vd.material_id = m.id
        WHERE v.empresa_id = ${empresaId}
          AND v.estado = 'procesada'
          AND v.fecha_venta >= CAST(${todayRange.gte} AS timestamp)
          AND v.fecha_venta < CAST(${todayRange.lt} AS timestamp)
      `,

      // Sesiones de caja abiertas (saldo en vivo + cajas sin cerrar de días anteriores)
      prisma.cajaGestion.findMany({
        where: { estado: 'Aperturada', caja: { empresa_id: empresaId } },
        include: {
          caja: { select: { id: true, codigo: true, descripcion: true } },
          sucursal: { select: { descripcion: true } },
          moneda: { select: { simbolo: true } },
          usuario_apertura: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha_apertura: 'desc' },
      }),

      // Arqueos con descuadre
      prisma.cajaArqueo.findMany({
        where: { diferencia: { not: 0 }, gestion: { caja: { empresa_id: empresaId } } },
        include: {
          gestion: {
            select: {
              id: true,
              caja: { select: { codigo: true, descripcion: true } },
              sucursal: { select: { descripcion: true } },
            },
          },
          usuario: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),

      // Stock actual vs mínimo + velocidad de venta (7 días) para proyección de quiebre
      prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT m.id, m.codigo, m.descripcion, m.stock_actual, m.stock_minimo, m.unidad_medida,
               COALESCE(SUM(vd.cantidad) FILTER (
                 WHERE v.estado = 'procesada' AND v.fecha_venta >= NOW() - INTERVAL '7 days'
               ), 0) AS qty_7d
        FROM "Material" m
        LEFT JOIN "VentaDetalle" vd ON vd.material_id = m.id
        LEFT JOIN "Venta" v ON vd.venta_id = v.id
        WHERE m.empresa_id = ${empresaId} AND m.activo = true
        GROUP BY m.id
      `,

      // Documentos pendientes de confirmación (cotizaciones sin concretar)
      prisma.venta.findMany({
        where: { empresa_id: empresaId, estado: 'cotizacion' },
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fecha_venta: 'desc' },
        take: 5,
      }),

      prisma.venta.count({ where: { empresa_id: empresaId, estado: 'cotizacion' } }),

      // Tendencia de ventas diarias (30 días, sin huecos)
      prisma.$queryRaw<Array<{ fecha: string; total: number }>>`
        SELECT TO_CHAR(d.fecha, 'YYYY-MM-DD') AS fecha,
               COALESCE(SUM(v.total), 0) AS total
        FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d(fecha)
        LEFT JOIN "Venta" v
          ON v.estado = 'procesada'
          AND v.empresa_id = ${empresaId}
          AND v.fecha_venta::date = d.fecha
        GROUP BY d.fecha
        ORDER BY d.fecha ASC
      `,

      // Categorías más vendidas (30 días)
      prisma.$queryRaw<Array<{ categoria: string; total: number }>>`
        SELECT COALESCE(mc.descripcion, 'Sin categoría') AS categoria,
               COALESCE(SUM(vd.subtotal), 0) AS total
        FROM "VentaDetalle" vd
        JOIN "Venta" v ON vd.venta_id = v.id
        LEFT JOIN "Material" m ON vd.material_id = m.id
        LEFT JOIN "MaterialCategoria" mc ON m.categoria_id = mc.id
        WHERE v.empresa_id = ${empresaId}
          AND v.estado = 'procesada'
          AND v.fecha_venta >= NOW() - INTERVAL '30 days'
        GROUP BY COALESCE(mc.descripcion, 'Sin categoría')
        ORDER BY total DESC
        LIMIT 6
      `,
    ])

    // ── Últimos movimientos de caja (se consulta tras conocer las sesiones abiertas) ──
    const movimientosCaja = await prisma.transaccionCaja.findMany({
      where: { empresa_id: empresaId },
      include: {
        concepto: { select: { descripcion: true, tipo_operacion: true } },
        cliente: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
        moneda: { select: { simbolo: true } },
        usuario_creador: { select: { nombre: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 8,
    })

    // ── Saldo de caja en vivo ──
    const sessionIds = openSessions.map((s) => s.id)
    const [txSumPositivo, txSumNegativo] = sessionIds.length
      ? await Promise.all([
          prisma.transaccionCaja.aggregate({
            where: { sesion_caja_id: { in: sessionIds }, estado: 'P', importe: { gt: 0 } },
            _sum: { importe: true },
          }),
          prisma.transaccionCaja.aggregate({
            where: { sesion_caja_id: { in: sessionIds }, estado: 'P', importe: { lt: 0 } },
            _sum: { importe: true },
          }),
        ])
      : [{ _sum: { importe: null } }, { _sum: { importe: null } }]

    let saldoCaja: { saldo: number; ingresos: number; egresos: number; sesionAbierta: boolean; detalle: string }
    if (sessionIds.length) {
      const ingresos = num(txSumPositivo._sum?.importe)
      const egresos = Math.abs(num(txSumNegativo._sum?.importe))
      saldoCaja = {
        saldo: openSessions.reduce((acc, s) => acc + num(s.monto_apertura), 0) + ingresos - egresos,
        ingresos,
        egresos,
        sesionAbierta: true,
        detalle: openSessions[0]
          ? `${openSessions[0].caja.descripcion} · ${openSessions[0].sucursal.descripcion}`
          : '',
      }
    } else {
      const comp = await prisma.transaccionCaja.findMany({
        where: { empresa_id: empresaId, estado: 'P', fecha_documento: todayRange },
        select: { importe: true },
      })
      const ingresos = comp.reduce((a, t) => a + (num(t.importe) > 0 ? num(t.importe) : 0), 0)
      const egresos = comp.reduce((a, t) => a + (num(t.importe) < 0 ? Math.abs(num(t.importe)) : 0), 0)
      saldoCaja = { saldo: ingresos - egresos, ingresos, egresos, sesionAbierta: false, detalle: 'Sin sesión abierta' }
    }

    // ── Derivar stock bajo / quiebre anticipado (principio de anticipación) ──
    const stockRows = (stockRaw || []).map((r) => ({
      id: num(r.id),
      codigo: String(r.codigo ?? ''),
      descripcion: String(r.descripcion ?? ''),
      unidad: String(r.unidad_medida ?? ''),
      stock: num(r.stock_actual),
      minimo: num(r.stock_minimo),
      qty7d: num(r.qty_7d),
      diasRestantes: diasRestantes(num(r.stock_actual), num(r.qty_7d)),
    }))

    const stockBajo = stockRows
      .filter((r) => r.minimo > 0 && r.stock < r.minimo)
      .sort((a, b) => a.stock - b.stock)

    const quiebreFlags = stockRows.map((r) => ({
      ...r,
      enQuiebre: r.stock <= 0 || (r.diasRestantes != null && r.diasRestantes < 5),
    }))
    const quiebreInminente = quiebreFlags
      .filter((r) => r.enQuiebre)
      .sort((a, b) => {
        const da = a.diasRestantes == null ? Number.MAX_SAFE_INTEGER : a.diasRestantes
        const db = b.diasRestantes == null ? Number.MAX_SAFE_INTEGER : b.diasRestantes
        return da - db
      })
      .slice(0, 5)

    const totalVentasDia = num(ventasDia._sum?.total)
    const totalVentasSemPasada = num(ventasDiaSemanaPasada._sum?.total)
    const variacionVentas =
      totalVentasSemPasada > 0
        ? ((totalVentasDia - totalVentasSemPasada) / totalVentasSemPasada) * 100
        : totalVentasDia > 0
          ? 100
          : 0

    const margenBruto = num(margenBrutoRaw?.[0]?.margen)
    const totalSeries = ventasDiarias.reduce((acc, e) => acc + num(e.total), 0)

    return NextResponse.json({
      fechaGeneracion: new Date().toISOString(),
      kpis: {
        ventasDia: {
          total: totalVentasDia,
          count: ventasDia._count,
        },
        ventasDiaSemanaPasada: totalVentasSemPasada,
        variacionVentas: Math.round(variacionVentas * 10) / 10,
        ticketPromedio: ventasDia._count > 0 ? totalVentasDia / ventasDia._count : 0,
        saldoCaja,
        margenBruto,
        margenPorcentaje: totalVentasDia > 0 ? (margenBruto / totalVentasDia) * 100 : 0,
        clientesAtendidos: clientesAtendidos.length,
      },
      alertas: {
        cajaSinCierre: openSessions
          .filter((s) => new Date(s.fecha_apertura).getTime() < todayRange.gte.getTime())
          .map((s) => ({
            id: s.id,
            caja: `${s.caja.codigo} · ${s.caja.descripcion}`,
            sucursal: s.sucursal.descripcion,
            usuario: s.usuario_apertura.nombre,
            fechaApertura: s.fecha_apertura.toISOString(),
            montoApertura: num(s.monto_apertura),
          })),
        descuadres: descuadres.map((a) => ({
          id: a.id,
          caja: `${a.gestion?.caja?.codigo ?? 'Caja'} · ${a.gestion?.caja?.descripcion ?? ''}`,
          sucursal: a.gestion?.sucursal?.descripcion ?? '',
          fecha: a.fecha.toISOString(),
          diferencia: num(a.diferencia),
          usuario: a.usuario.nombre,
        })),
        stockBajo: {
          count: stockBajo.length,
          items: stockBajo.slice(0, 8),
        },
        quiebreInminente: {
          count: quiebreFlags.filter((r) => r.enQuiebre).length,
        },
        docsPendientes: {
          count: cotizacionesCount,
          items: cotizaciones.map((c: any) => ({
            id: c.id,
            numero_pedido: c.numero_pedido,
            cliente: c.cliente?.nombre ?? '',
            total: num(c.total),
            fecha: c.fecha_venta.toISOString(),
          })),
        },
        // El modelo de datos aún no contempla cuentas por cobrar con vencimientos;
        // la estructura queda lista para conectarse cuando exista el módulo.
        cobranzas: {
          vencidas: 0,
          porVencer48h: 0,
        },
      },
      tendencias: {
        ventasDiarias: ventasDiarias.map((e) => ({ fecha: e.fecha, total: num(e.total) })),
        metaPromedio: ventasDiarias.length > 0 ? totalSeries / ventasDiarias.length : 0,
        categorias: categoriasVendidas.map((c) => ({ nombre: c.categoria, total: num(c.total) })),
      },
      listas: {
        quiebreStock: quiebreInminente.map((r) => ({
          id: r.id,
          codigo: r.codigo,
          descripcion: r.descripcion,
          unidad: r.unidad,
          stock: r.stock,
          minimo: r.minimo,
          diasRestantes: r.diasRestantes,
        })),
        movimientosCaja: movimientosCaja.map((t) => ({
          id: t.id,
          fecha: t.created_at.toISOString(),
          concepto: t.concepto.descripcion,
          tipoOperacion: t.concepto.tipo_operacion,
          persona:
            t.cliente?.nombre ??
            t.proveedor?.nombre ??
            t.persona ??
            t.usuario_creador?.nombre ??
            null,
          importe: num(t.importe),
          monedaSimbolo: t.moneda.simbolo,
          estado: t.estado,
          esAnulacion: t.transaccion_anula_id != null,
        })),
        clientesDeuda: [],
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard] Error:', err)
    return NextResponse.json({ error: 'Error al cargar dashboard' }, { status: 500 })
  }
}