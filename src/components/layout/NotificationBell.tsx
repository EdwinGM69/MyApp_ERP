'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import NotificationDetalle from '@/components/layout/NotificationDetalle'
import {
  useNotificaciones,
  tiempoRelativo,
  esTextoLargo,
  ESTILO_NOTIFICACION,
  type Notificacion,
  type TipoNotificacion,
} from '@/lib/notificaciones'

const ANCHO_PANEL = 384
const RETRASO_MARCAR_LEIDAS = 800

type Filtro = 'todas' | TipoNotificacion

const FILTROS: Array<{ id: Filtro; etiqueta: string }> = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'error', etiqueta: 'Errores' },
  { id: 'warning', etiqueta: 'Alertas' },
  { id: 'info', etiqueta: 'Avisos' },
  { id: 'success', etiqueta: 'Éxitos' },
]

/**
 * Detecta si un texto recortado con `line-clamp` tiene contenido oculto.
 *
 * Se mide en el DOM en lugar de estimar por longitud: el mismo mensaje ocupa
 * una línea o cinco según el ancho del panel, y un contador de caracteres
 * mostraría "Ver más" en mensajes que no lo necesitan.
 */
function useDesborde<T extends HTMLElement>(medir: boolean) {
  const [desborda, setDesborda] = useState(false)

  const ref = useCallback(
    (elemento: T | null) => {
      if (!elemento || !medir) return
      setDesborda(elemento.scrollHeight > elemento.clientHeight + 1)
    },
    [medir]
  )

  return { ref, desborda }
}

interface Props {
  className?: string
}

export default function NotificationBell({ className }: Props) {
  const router = useRouter()
  const items = useNotificaciones((s) => s.items)
  const sinLeer = useNotificaciones((s) => s.sinLeer)
  const marcarTodasLeidas = useNotificaciones((s) => s.marcarTodasLeidas)
  const marcarLeida = useNotificaciones((s) => s.marcarLeida)
  const eliminar = useNotificaciones((s) => s.eliminar)
  const limpiar = useNotificaciones((s) => s.limpiar)

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [ahora, setAhora] = useState(0)
  const [detalle, setDetalle] = useState<{
    notificacion: Notificacion
    origen: HTMLElement | null
  } | null>(null)
  const botonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    setAhora(Date.now())
  }, [])

  const abrir = useCallback(() => {
    const rect = botonRef.current?.getBoundingClientRect()
    if (rect) {
      const derecho = window.innerWidth - rect.right
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(8, Math.min(derecho, window.innerWidth - ANCHO_PANEL - 8)),
      })
    }
    setOpen(true)
  }, [])

  const cerrar = useCallback(() => {
    setOpen(false)
    setCoords(null)
  }, [])

  useEffect(() => {
    if (!open) return

    function fuera(event: MouseEvent) {
      const objetivo = event.target as Node
      if (botonRef.current?.contains(objetivo)) return
      const panel = document.getElementById('notification-panel-portal')
      if (panel?.contains(objetivo)) return
      // El diálogo vive en otro portal: interactuar con él no cierra el panel,
      // que queda detrás esperando a que se cierre el mensaje.
      const dialogo = document.getElementById('notification-detail-portal')
      if (dialogo?.contains(objetivo)) return
      cerrar()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') cerrar()
    }

    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [open, cerrar])

  // Se marcan leídas poco después de abrir, para que el usuario vea bajar el
  // contador antes de perder la señal.
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => marcarTodasLeidas(), RETRASO_MARCAR_LEIDAS)
    return () => clearTimeout(timer)
  }, [open, marcarTodasLeidas])

  // Mantiene frescos los tiempos relativos mientras el panel está visible.
  useEffect(() => {
    if (!open) return
    setAhora(Date.now())
    const timer = setInterval(() => setAhora(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [open])

  const conteos = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const n of items) mapa[n.tipo] = (mapa[n.tipo] ?? 0) + 1
    return mapa
  }, [items])

  const visibles = useMemo(
    () => (filtro === 'todas' ? items : items.filter((n) => n.tipo === filtro)),
    [items, filtro]
  )

  function abrirDetalle(notificacion: Notificacion, origen: HTMLElement) {
    setDetalle({ notificacion, origen })
  }

  return (
    <>
      <button
        ref={botonRef}
        onClick={() => (open ? cerrar() : abrir())}
        aria-label="Notificaciones"
        aria-expanded={open}
        title="Notificaciones"
        className={cn(
          'p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative',
          open && 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white',
          className
        )}
      >
        <span
          className="material-symbols-outlined"
          style={sinLeer > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {sinLeer > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {mounted && sinLeer > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums pointer-events-none">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {open && coords && mounted
        ? createPortal(
            <div
              id="notification-panel-portal"
              style={{
                position: 'fixed',
                top: coords.top,
                right: coords.right,
                width: ANCHO_PANEL,
                maxWidth: 'calc(100vw - 1rem)',
                // Por encima del Toaster (9999): ambos viven en la misma esquina.
                zIndex: 10000,
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    Notificaciones
                  </h3>
                  {items.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                      {items.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {sinLeer > 0 && (
                    <button
                      onClick={marcarTodasLeidas}
                      className="text-[10px] font-black uppercase tracking-tight text-primary hover:underline"
                    >
                      Marcar leídas
                    </button>
                  )}
                  {items.length > 0 && (
                    <button
                      onClick={limpiar}
                      className="text-[10px] font-black uppercase tracking-tight text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0">
                {FILTROS.map((f) => {
                  const total =
                    f.id === 'todas' ? items.length : (conteos[f.id as TipoNotificacion] ?? 0)
                  if (f.id !== 'todas' && total === 0) return null
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFiltro(f.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors border',
                        filtro === f.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      {f.etiqueta}
                      <span className="ml-1 tabular-nums opacity-70">{total}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                {visibles.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-700 mb-2">
                      notifications_none
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {items.length === 0
                        ? 'Sin notificaciones'
                        : 'Nada en este filtro'}
                    </p>
                  </div>
                ) : (
                  visibles.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notificacion={n}
                      ahora={ahora}
                      onAbrirDetalle={abrirDetalle}
                    />
                  ))
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {detalle && (
        <NotificationDetalle
          notificacion={detalle.notificacion}
          origen={detalle.origen}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </>
  )
}

const ETIQUETA_ACCION =
  'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-black uppercase tracking-tight text-primary hover:bg-primary/10 transition-colors'

/**
 * Una notificación del panel.
 *
 * Leer es la tarea principal, así que el texto es el control: si hay algo
 * escondido detrás del recorte, la fila lo despliega. Navegar es secundario y
 * por eso vive en un enlace explícito, no en el clic sobre toda la fila.
 */
function NotificationRow({
  notificacion: n,
  ahora,
  onAbrirDetalle,
}: {
  notificacion: Notificacion
  ahora: number
  onAbrirDetalle: (n: Notificacion, origen: HTMLElement) => void
}) {
  const router = useRouter()
  const eliminar = useNotificaciones((s) => s.eliminar)
  const marcarLeida = useNotificaciones((s) => s.marcarLeida)
  const [expandida, setExpandida] = useState(false)
  const estilo = ESTILO_NOTIFICACION[n.tipo]

  // Un mensaje enorme no se expande en línea: hundiría la lista entera.
  const largo = esTextoLargo(n.detalle ?? n.titulo)
  const colapsado = !expandida && !largo

  const titulo = useDesborde<HTMLSpanElement>(colapsado)
  const detalle = useDesborde<HTMLSpanElement>(colapsado)
  const desbordado = !largo && (titulo.desborda || detalle.desborda)

  const contenido = (
    <>
      <span
        ref={titulo.ref}
        className={cn(
          'block text-xs leading-snug break-words',
          colapsado && 'line-clamp-2',
          n.leida
            ? 'font-medium text-slate-500 dark:text-slate-400'
            : 'font-bold text-slate-900 dark:text-white'
        )}
      >
        {n.titulo}
      </span>
      {n.detalle && (
        <span
          ref={detalle.ref}
          className={cn(
            'block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-pre-line break-words',
            colapsado && 'line-clamp-2'
          )}
        >
          {n.detalle}
        </span>
      )}
    </>
  )

  function alternar() {
    marcarLeida(n.id)
    setExpandida((v) => !v)
  }

  return (
    <div className={cn('group relative px-4 py-3 transition-colors', estilo.fila)}>
      <div className="flex items-start gap-3">
        <div className={cn('size-8 rounded-xl flex items-center justify-center shrink-0', estilo.fondoIcono)}>
          <span className={cn('material-symbols-outlined text-lg', estilo.texto)}>{estilo.icono}</span>
        </div>

        <div className="min-w-0 flex-1">
          {desbordado ? (
            <button
              type="button"
              onClick={alternar}
              aria-expanded={expandida}
              className="block w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            >
              {contenido}
            </button>
          ) : (
            <span className="block">{contenido}</span>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-slate-400 font-medium">
            <span>{ahora ? tiempoRelativo(n.creado_en, ahora) : ''}</span>
            {n.veces > 1 && (
              <span className="px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-black tabular-nums">
                ×{n.veces}
              </span>
            )}
            {n.origen === 'negocio' && (
              <span className="px-1.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-500 font-black uppercase tracking-tight">
                Alerta
              </span>
            )}
            {desbordado && (
              <button type="button" onClick={alternar} aria-expanded={expandida} className={ETIQUETA_ACCION}>
                {expandida ? 'Ver menos' : 'Ver más'}
              </button>
            )}
            {largo && (
              <button
                type="button"
                onClick={(e) => {
                  marcarLeida(n.id)
                  onAbrirDetalle(n, e.currentTarget)
                }}
                className={ETIQUETA_ACCION}
              >
                Ver mensaje completo
              </button>
            )}
            {n.href && (
              <button
                type="button"
                onClick={() => {
                  marcarLeida(n.id)
                  router.push(n.href!)
                }}
                className={ETIQUETA_ACCION}
              >
                Ver detalle
                <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1 shrink-0 pt-0.5">
          {!n.leida && <span className={cn('size-2 rounded-full', estilo.punto)} />}
          <button
            type="button"
            onClick={() => eliminar(n.id)}
            title="Descartar"
            aria-label="Descartar notificación"
            className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
