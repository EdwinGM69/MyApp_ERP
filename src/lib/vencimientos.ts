import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { businessToday, dayRangeUtc } from '@/lib/dates'

/**
 * Ventana de anticipación para evaluar el stock por vencer.
 * "En los próximos 15 días" incluye hoy (0 días) y el día 15 en curso.
 */
export const DIAS_VENCIMIENTO = 15

/** Dentro de este plazo el vencimiento ya es crítico y no solo una advertencia. */
export const DIAS_VENCIMIENTO_CRITICO = 3

export interface VencimientoRow {
  material_id: number
  codigo: string
  descripcion: string
  unidad: string
  fechaVencimiento: string
  diasRestantes: number
  stock: number
  lotes: number
}

export interface VencimientosResumen {
  total: number
  criticos: number
  items: VencimientoRow[]
}

interface RawVencimiento {
  material_id: number
  codigo: string
  descripcion: string
  unidad_medida: string | null
  fecha: string
  dias: number
  stock: number
  lotes: number
  total: number
  criticos: number
}

function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d + dias))
  const mes = String(f.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(f.getUTCDate()).padStart(2, '0')
  return `${f.getUTCFullYear()}-${mes}-${dia}`
}

/**
 * Materiales con existencias cuyo lote vence dentro de la ventana.
 *
 * El vencimiento real vive en `Lote.fecha_expiracion`, que se escribe al
 * registrar un ingreso con lote; el stock se fragmenta en `StockMaterial` por
 * número de lote, de modo que el cruce de ambos da la cantidad que está por
 * vencer (no solo la existencia del lote).
 *
 * `Material.fecha_vencimiento` sirve de respaldo para materiales perecibles sin
 * control por lote: hoy ningún formulario la captura, pero el modelo ya la
 * contempla y evita que un maestro así quede invisible.
 *
 * `db` permite ejecutar la consulta dentro de una transacción (pruebas).
 */
export async function consultarVencimientos(
  empresaId: number,
  limite = 6,
  db: PrismaClient | Prisma.TransactionClient = prisma
): Promise<VencimientosResumen> {
  const hoy = businessToday()
  const desde = dayRangeUtc(hoy).gte
  const hasta = dayRangeUtc(sumarDias(hoy, DIAS_VENCIMIENTO)).lt

  const rows = await db.$queryRaw<RawVencimiento[]>`
    WITH lotes AS (
      SELECT sm.material_id,
             l.fecha_expiracion,
             SUM(sm.cantidad) AS stock
      FROM "StockMaterial" sm
      JOIN "Lote" l
        ON l.empresa_id = sm.empresa_id
       AND l.material_id = sm.material_id
       AND l.numero_lote = sm.numero_lote
       AND l.activo = true
      WHERE sm.empresa_id = ${empresaId}
        AND sm.numero_lote IS NOT NULL
        AND l.fecha_expiracion IS NOT NULL
        AND l.fecha_expiracion >= CAST(${desde} AS timestamp)
        AND l.fecha_expiracion < CAST(${hasta} AS timestamp)
      GROUP BY sm.material_id, sm.numero_lote, l.fecha_expiracion
      HAVING SUM(sm.cantidad) > 0
    ),
    materiales AS (
      SELECT m.id AS material_id,
             m.fecha_vencimiento,
             m.stock_actual AS stock
      FROM "Material" m
      WHERE m.empresa_id = ${empresaId}
        AND m.activo = true
        AND m.perecible = true
        AND COALESCE(m.stock_lote, false) = false
        AND m.fecha_vencimiento IS NOT NULL
        AND m.stock_actual > 0
        AND m.fecha_vencimiento >= CAST(${desde} AS timestamp)
        AND m.fecha_vencimiento < CAST(${hasta} AS timestamp)
    ),
    detalle AS (
      SELECT material_id, fecha_expiracion, stock, 1 AS por_lote FROM lotes
      UNION ALL
      SELECT material_id, fecha_vencimiento, stock, 0 AS por_lote FROM materiales
    ),
    por_material AS (
      SELECT material_id,
             MIN(fecha_expiracion) AS fecha_expiracion,
             SUM(stock) AS stock,
             COUNT(*) FILTER (WHERE por_lote = 1) AS lotes,
             MIN(fecha_expiracion)::date - CAST(${hoy} AS date) AS dias
      FROM detalle
      GROUP BY material_id
    )
    SELECT m.id AS material_id,
           m.codigo,
           m.descripcion,
           m.unidad_medida,
           TO_CHAR(p.fecha_expiracion, 'YYYY-MM-DD') AS fecha,
           p.dias::int AS dias,
           p.stock,
           p.lotes::int AS lotes,
           COUNT(*) OVER ()::int AS total,
           SUM(CASE WHEN p.dias <= ${DIAS_VENCIMIENTO_CRITICO} THEN 1 ELSE 0 END) OVER ()::int AS criticos
    FROM por_material p
    JOIN "Material" m ON m.id = p.material_id AND m.activo = true
    ORDER BY p.fecha_expiracion ASC
    LIMIT ${limite}
  `

  const items: VencimientoRow[] = rows.map((r) => ({
    material_id: Number(r.material_id),
    codigo: String(r.codigo ?? ''),
    descripcion: String(r.descripcion ?? ''),
    unidad: String(r.unidad_medida ?? ''),
    fechaVencimiento: String(r.fecha),
    diasRestantes: Number(r.dias),
    stock: Number(r.stock),
    lotes: Number(r.lotes),
  }))

  return {
    total: rows.length > 0 ? Number(rows[0].total) : 0,
    criticos: rows.length > 0 ? Number(rows[0].criticos) : 0,
    items,
  }
}