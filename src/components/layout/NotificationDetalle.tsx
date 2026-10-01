'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  tiempoRelativo,
  ESTILO_NOTIFICACION,
  type Notificacion,
} from '@/lib/notificaciones'

/** Por encima del panel (10000) y del Toaster de react-hot-toast (9999). */
const Z_INDEX = 10001
const RETRASO_CONFIRMACION_MS = 2_000
const SEL_FOCO =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

interface Props {
  notificacion: Notificacion
  onCerrar: () => void
  /** Elemento que abrió el diálogo, para devolverle el foco al cerrar. */
  origen: HTMLElement | null
}

/**
 * Lectura completa de un mensaje que no cabe en la fila.
 *
 * Existe porque expandir en línea un texto de miles de caracteres dejaría la
 * lista inutilizable: el diálogo tiene su propio scroll, así que el panel nunca
 * queda con dos barras anidadas.
 */
export default function NotificationDetalle({ notificacion, onCerrar, origen }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const dialogoRef = useRef<HTMLDivElement>(null)

  const estilo = ESTILO_NOTIFICACION[notificacion.tipo]
  const completo = notificacion.detalle
    ? `${notificacion.titulo}\n${notificacion.detalle}`
    : notificacion.titulo

  useEffect(() => {
    setMounted(true)
    dialogoRef.current?.focus()
    const timer = setTimeout(() => setAhora(Date.now()), 60_000)
    return () => clearTimeout(timer)
  }, [])

  // Devuelve el foco a donde estaba: si no, el foco cae al body y el usuario
  // pierde el lugar en la lista.
  useEffect(() => {
    return () => {
      origen?.focus()
    }
  }, [origen])

  // El texto puede ser largo, así que el diálogo también se autolimita para no
  // exceder el viewport en pantallas bajas.
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCerrar()
        return
      }
      if (event.key !== 'Tab') return

      const focoables = dialogoRef.current?.querySelectorAll<HTMLElement>(SEL_FOCO)
      if (!focoables?.length) return
      const primero = focoables[0]
      const ultimo = focoables[focoables.length - 1]

      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [onCerrar])

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(completo)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }, [completo])

  useEffect(() => {
    if (!copiado) return
    const timer = setTimeout(() => setCopiado(false), RETRASO_CONFIRMACION_MS)
    return () => clearTimeout(timer)
  }, [copiado])

  if (!mounted) return null

  return createPortal(
    <div
      id="notification-detail-portal"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX }}
      // El cierre va en el overlay, no en el contenedor: el overlay es el único
      // hijo que realmente cubre la pantalla, y comparar `e.target` con el
      // padre desde aquí nunca coincidiría con los clics sobre el fondo.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden="true"
        onMouseDown={onCerrar}
      />

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl outline-none"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div
            className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', estilo.fondoIcono)}
          >
            <span className={cn('material-symbols-outlined text-xl', estilo.texto)}>
              {estilo.icono}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h4
              id="notification-detail-title"
              className="text-sm font-bold text-slate-900 dark:text-white leading-snug"
            >
              {notificacion.titulo}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
              <span>{tiempoRelativo(notificacion.creado_en, ahora)}</span>
              {notificacion.veces > 1 && (
                <span className="px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-black tabular-nums">
                  ×{notificacion.veces}
                </span>
              )}
              {notificacion.origen === 'negocio' && (
                <span className="px-1.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-500 font-black uppercase tracking-tight">
                  Alerta
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notificacion.detalle && (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
              {notificacion.detalle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          {notificacion.href ? (
            <button
              type="button"
              onClick={() => {
                onCerrar()
                router.push(notificacion.href!)
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              Ir al módulo
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={copiar}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors',
              copiado
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span className="material-symbols-outlined text-base">
              {copiado ? 'check' : 'content_copy'}
            </span>
            {copiado ? 'Copiado' : 'Copiar mensaje'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}