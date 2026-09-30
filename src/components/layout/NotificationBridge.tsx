'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { apiFetch, getAuthStore } from '@/hooks/useAuth'
import {
  useNotificaciones,
  textoPlano,
  type AlertaNegocio,
  type TipoNotificacion,
} from '@/lib/notificaciones'

const MARCA_PATCH = Symbol.for('erp.notificaciones.toastBridge')
const INTERVALO_ALERTAS_MS = 5 * 60_000
const INTERVALO_REINTENTO_MS = 3_000
const INTERVALO_PODA_MS = 60_000

type ToastHandler = typeof toast.success

/**
 * Envuelve los métodos de toast para copiar el mensaje al centro de
 * notificaciones sin alterar su comportamiento: se llama al original primero
 * y se devuelve su mismo id, porque hay call sites que lo usan como expresión
 * (`return toast.error(...)`).
 *
 * Se parchea el singleton de react-hot-toast y no los 427 call sites que ya
 * existen en 93 archivos: así el centro captura también el código futuro sin
 * disciplina extra, y los toasts siguen apareciendo exactamente igual.
 */
function parchearToast() {
  const api = toast as unknown as Record<string, unknown> & { [MARCA_PATCH]?: boolean }
  if (api[MARCA_PATCH]) return

  const envolver =
    (tipo: TipoNotificacion, original: ToastHandler): ToastHandler =>
    (message, options) => {
      const id = original(message, options)
      const texto = textoPlano(message)
      if (texto) {
        useNotificaciones.getState().registrar(tipo, texto)
      }
      return id
    }

  api.success = envolver('success', toast.success)
  api.error = envolver('error', toast.error)
  api[MARCA_PATCH] = true
}

interface ResumenAlertas {
  total: number
  items?: Array<Record<string, unknown>>
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

function plural(total: number, singular: string, pluralForma: string): string {
  return `${total} ${total === 1 ? singular : pluralForma}`
}

/**
 * Traduce el snapshot del endpoint a un máximo de 5 alertas. La clave es estable
 * por categoría y no por ítem, para que un mismo estado no genere una entrada
 * nueva cada sondeo y para que al resolverse se retire sola del panel.
 */
function mapearAlertas(data: Record<string, unknown> | undefined): AlertaNegocio[] {
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

export default function NotificationBridge() {
  // 1. Captura los mensajes de proceso sin quitar los toasts.
  useEffect(() => {
    parchearToast()
  }, [])

  // 2. Poda periódica: descarta lo que venció según su severidad.
  useEffect(() => {
    const timer = setInterval(() => {
      useNotificaciones.getState().podar()
    }, INTERVALO_PODA_MS)
    return () => clearInterval(timer)
  }, [])

  // 3. Alertas de negocio: sondeo pausado si la pestaña no está visible.
  useEffect(() => {
    let cancelado = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let primeraCarga = true

    async function sondear(): Promise<number> {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return INTERVALO_ALERTAS_MS
      }

      // La sesión puede no estar hidratada todavía al montar: se reintenta pronto.
      if (!getAuthStore().user) return INTERVALO_REINTENTO_MS

      try {
        const res = await apiFetch('/api/notificaciones/alertas')
        if (res.ok && !cancelado) {
          const json = await res.json()
          if (!cancelado) {
            useNotificaciones
              .getState()
              .sincronizarAlertas(mapearAlertas(json.data), { silencioso: primeraCarga })
          }
        }
      } catch {
        // El sondeo es best-effort: si falla, no se molesta al usuario.
      } finally {
        primeraCarga = false
      }

      return INTERVALO_ALERTAS_MS
    }

    async function ciclo() {
      if (cancelado) return
      const espera = await sondear()
      if (cancelado) return
      // Un focus/visibilitychange puede disparar el ciclo mientras el anterior
      // sigue en vuelo: se cancela el temporizador previo para no acumularlos.
      if (timer) clearTimeout(timer)
      timer = setTimeout(ciclo, espera)
    }

    ciclo()

    function alCambiarVisibilidad() {
      if (document.visibilityState === 'visible') ciclo()
    }

    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    window.addEventListener('focus', alCambiarVisibilidad)

    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      window.removeEventListener('focus', alCambiarVisibilidad)
    }
  }, [])

  return null
}
