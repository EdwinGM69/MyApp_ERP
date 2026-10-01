'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { apiFetch, getAuthStore } from '@/hooks/useAuth'
import { mapearAlertas } from '@/lib/alertas'
import {
  useNotificaciones,
  textoPlano,
  SIN_NOTIFICAR,
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

      // Un toast marcado así ya se registró a mano con más detalle del que cabe
      // acá: copiarlo otra vez duplicaría la entrada en el centro.
      const opciones = options as Record<string, unknown> | undefined
      if (opciones?.[SIN_NOTIFICAR]) return id

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
