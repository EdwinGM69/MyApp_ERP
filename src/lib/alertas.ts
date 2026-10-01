import type { AlertaNegocio } from '@/lib/notificaciones'

/**
 * Traducción del snapshot de /api/notificaciones/alertas a las entradas del
 * centro de notificaciones.
 *
 * Vive fuera del componente para poder ejercitarse sin React ni navegador: son
 * funciones puras sobre la forma del JSON, que es donde se decide el título,
 * la severidad y qué se avisa.
 *
 * La clave es estable por categoría y no por ítem, para que un mismo estado no
 * genere una entrada nueva en cada sondeo y para que al resolverse se retire
 * sola del panel.
 */

interface ResumenAlertas {
  total: number
  items?: Array<Record<string, unknown>>
}

interface ResumenVencimientos extends ResumenAlertas {
  criticos?: number
  dias?: number
}

function lista(
  items: Array<Record<string, unknown>> | undefined,
  campo: string,
  limite = 3
): string {
  if (!items?.length) return ''
  return items
    .slice(0, limite)
    .map((i) => String(i[campo] ?? ''))
    .filter(Boolean)
    .join(' · ')
}

/** "3 días" / "1 día" / "vence hoy", a partir de los días restantes del backend. */
export function fmtPlazo(dias: unknown): string {
  const d = Number(dias)
  if (!Number.isFinite(d)) return ''
  if (d <= 0) return 'vence hoy'
  return `${d} ${d === 1 ? 'día' : 'días'}`
}

/** Los ítems más urgentes abren el detalle: los días menores van primero. */
export function listaVencimientos(items: Array<Record<string, unknown>> | undefined): string {
  if (!items?.length) return ''
  return [...items]
    .sort((a, b) => Number(a.dias ?? 0) - Number(b.dias ?? 0))
    .slice(0, 3)
    .map((i) => {
      const nombre = String(i.descripcion ?? '').trim()
      const plazo = fmtPlazo(i.dias)
      return plazo ? `${nombre} · ${plazo}` : nombre
    })
    .filter(Boolean)
    .join(' · ')
}

export function plural(total: number, singular: string, pluralForma: string): string {
  return `${total} ${total === 1 ? singular : pluralForma}`
}

export function mapearAlertas(data: Record<string, unknown> | undefined): AlertaNegocio[] {
  const alertas: AlertaNegocio[] = []
  if (!data) return alertas

  const resumen = (clave: string): ResumenAlertas | undefined =>
    data[clave] as ResumenAlertas | undefined

  const cajas = resumen('cajasSinCierre')
  if (cajas) {
    alertas.push({
      clave: 'negocio:cajas-sin-cierre',
      tipo: 'error',
      titulo: `${plural(cajas.total, 'caja sigue abierta', 'cajas siguen abiertas')} desde ayer`,
      detalle: lista(cajas.items, 'caja'),
      href: '/gestion-caja',
    })
  }

  const descuadres = resumen('descuadres')
  if (descuadres) {
    alertas.push({
      clave: 'negocio:descuadres',
      tipo: 'error',
      titulo: plural(
        descuadres.total,
        'arqueo con descuadre',
        'arqueos con descuadre'
      ),
      detalle: lista(descuadres.items, 'caja'),
      href: '/gestion-caja',
    })
  }

  const agotados = resumen('materialesAgotados')
  if (agotados) {
    alertas.push({
      clave: 'negocio:materiales-agotados',
      tipo: 'warning',
      titulo: plural(agotados.total, 'material agotado', 'materiales agotados'),
      detalle: 'Stock en cero con mínimo configurado',
      href: '/consultas/stock',
    })
  }

  const stockBajo = resumen('stockBajo')
  if (stockBajo) {
    alertas.push({
      clave: 'negocio:stock-bajo',
      tipo: 'warning',
      titulo: plural(stockBajo.total, 'material bajo el mínimo', 'materiales bajo el mínimo'),
      detalle: lista(stockBajo.items, 'descripcion'),
      href: '/consultas/stock',
    })
  }

  const porVencer = resumen('porVencer') as ResumenVencimientos | undefined
  if (porVencer) {
    const ventana = Number(porVencer.dias ?? 15)
    const criticos = Number(porVencer.criticos ?? 0)
    alertas.push({
      clave: 'negocio:productos-por-vencer',
      // Escalar a error solo cuando algo vence en días: ahí la pérdida ya es
      // inminente y no una advertencia de inventario.
      tipo: criticos > 0 ? 'error' : 'warning',
      titulo: `${plural(
        porVencer.total,
        'producto vence',
        'productos vencen'
      )} en ${ventana} días`,
      detalle: listaVencimientos(porVencer.items),
      href: '/consultas/stock',
    })
  }

  const pendientes = resumen('documentosPendientes')
  if (pendientes) {
    alertas.push({
      clave: 'negocio:documentos-pendientes',
      tipo: 'info',
      titulo: plural(
        pendientes.total,
        'documento por confirmar',
        'documentos por confirmar'
      ),
      detalle: lista(pendientes.items, 'numero'),
      href: '/ventas',
    })
  }

  return alertas
}