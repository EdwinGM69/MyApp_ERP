'use client'

import { create } from 'zustand'

export type TipoNotificacion = 'success' | 'error' | 'warning' | 'info'

export type OrigenNotificacion = 'proceso' | 'negocio'

export interface Notificacion {
  id: string
  tipo: TipoNotificacion
  titulo: string
  detalle?: string
  creado_en: number
  leida: boolean
  veces: number
  origen: OrigenNotificacion
  /** Solo para alertas de negocio: identidad estable para detectar aparición/desaparición. */
  clave?: string
  href?: string
}

// ── Política de volumen ────────────────────────────────────────────────────────
// Un centro de notificaciones no es un log: conserva lo reciente y relevante,
// agrupa lo repetido y descarta el resto.
export const MAX_NOTIFICACIONES = 25
export const VENTANA_AGRUPACION_MS = 15_000
export const TTL_POR_TIPO: Record<TipoNotificacion, number> = {
  success: 10 * 60_000,
  info: 15 * 60_000,
  warning: 20 * 60_000,
  error: 60 * 60_000,
}

export const TTL_NEGOCIO_MS = 24 * 60 * 60_000

// ── Presentación por severidad ────────────────────────────────────────────────
export const ESTILO_NOTIFICACION: Record<
  TipoNotificacion,
  { icono: string; texto: string; punto: string; fila: string; fondoIcono: string }
> = {
  success: {
    icono: 'check_circle',
    texto: 'text-emerald-600 dark:text-emerald-400',
    punto: 'bg-emerald-500',
    fila: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5',
    fondoIcono: 'bg-emerald-100 dark:bg-emerald-500/10',
  },
  error: {
    icono: 'error',
    texto: 'text-red-600 dark:text-red-400',
    punto: 'bg-red-500',
    fila: 'hover:bg-red-50/60 dark:hover:bg-red-500/5',
    fondoIcono: 'bg-red-100 dark:bg-red-500/10',
  },
  warning: {
    icono: 'warning',
    texto: 'text-amber-600 dark:text-amber-400',
    punto: 'bg-amber-500',
    fila: 'hover:bg-amber-50/60 dark:hover:bg-amber-500/5',
    fondoIcono: 'bg-amber-100 dark:bg-amber-500/10',
  },
  info: {
    icono: 'info',
    texto: 'text-blue-600 dark:text-blue-400',
    punto: 'bg-blue-500',
    fila: 'hover:bg-blue-50/60 dark:hover:bg-blue-500/5',
    fondoIcono: 'bg-blue-100 dark:bg-blue-500/10',
  },
}

let contador = 0

function nuevoId(): string {
  contador += 1
  return `ntf_${Date.now().toString(36)}_${contador.toString(36)}`
}

/**
 * Convierte a texto plano el mensaje de un toast. La mayoría de llamadas usan
 * strings, pero hay 5 sitios de importación de datos que pasan JSX anidado.
 */
export function textoPlano(valor: unknown): string {
  if (valor == null || valor === false) return ''
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) {
    // Los hijos JSX son fragmentos de la misma frase: se unen y se colapsan los
    // espacios sobrantes que deja el corte entre nodos ("Errores de " + "importación").
    return valor
      .map(textoPlano)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
  }

  const elemento = valor as { props?: Record<string, unknown> }
  if (typeof elemento === 'object' && elemento.props) {
    const children = (elemento.props as { children?: unknown }).children
    const texto = textoPlano(children)
    if (texto) return texto
  }

  return ''
}

/** Recorta a la primera línea para no romper el layout del panel. */
function resumir(texto: string, max = 160): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio
}

export interface RegistrarOpciones {
  titulo?: string
  detalle?: string
  href?: string
  clave?: string
}

interface NotificacionesState {
  items: Notificacion[]
  sinLeer: number
  registrar: (tipo: TipoNotificacion, mensaje: string, opciones?: RegistrarOpciones) => void
  sincronizarAlertas: (alertas: AlertaNegocio[], opciones?: { silencioso?: boolean }) => void
  marcarTodasLeidas: () => void
  marcarLeida: (id: string) => void
  eliminar: (id: string) => void
  limpiar: () => void
  podar: () => void
}

export interface AlertaNegocio {
  clave: string
  tipo: TipoNotificacion
  titulo: string
  detalle?: string
  href?: string
}

function contar(items: Notificacion[]): number {
  return items.reduce((acc, n) => acc + (n.leida ? 0 : 1), 0)
}

function recortar(items: Notificacion[]): Notificacion[] {
  return items.length > MAX_NOTIFICACIONES
    ? items.slice(0, MAX_NOTIFICACIONES)
    : items
}

export const useNotificaciones = create<NotificacionesState>((set, get) => ({
  items: [],
  sinLeer: 0,

  registrar: (tipo, mensaje, opciones = {}) => {
    const titulo = resumir(opciones.titulo || mensaje)
    if (!titulo) return

    set((state) => {
      const ahora = Date.now()
      const duplicada = opciones.clave
        ? state.items.find((n) => n.clave === opciones.clave)
        : state.items.find(
            (n) => n.origen === 'proceso' && n.tipo === tipo && n.titulo === titulo
          )

      if (duplicada && ahora - duplicada.creado_en <= VENTANA_AGRUPACION_MS) {
        const items = state.items.map((n) =>
          n.id === duplicada.id
            ? { ...n, veces: n.veces + 1, creado_en: ahora, leida: false }
            : n
        )
        return { items, sinLeer: contar(items) }
      }

      const nueva: Notificacion = {
        id: nuevoId(),
        tipo,
        titulo,
        detalle: opciones.detalle ? resumir(opciones.detalle, 300) : undefined,
        creado_en: ahora,
        leida: false,
        veces: 1,
        origen: 'proceso',
        href: opciones.href,
        clave: opciones.clave,
      }

      const items = recortar([nueva, ...state.items])
      return { items, sinLeer: contar(items) }
    })
  },

  /**
   * Las alertas de negocio son estado, no eventos: se comparan contra el
   * snapshot anterior para no generar una notificación nueva cada sondeo.
   *
   * `silencioso` marca como leídas las alertas nuevas: sirve para la primera
   * carga, donde lo que ya estaba pendiente no debe generar un badge rojo.
   */
  sincronizarAlertas: (alertas, opciones = {}) => {
    set((state) => {
      const vigentes = new Set(alertas.map((a) => a.clave))
      const existentes = state.items.filter((n) => n.origen === 'negocio')
      const clavesConocidas = new Set(existentes.map((n) => n.clave))
      const ahora = Date.now()

      const nuevas: Notificacion[] = alertas
        .filter((a) => !clavesConocidas.has(a.clave))
        .map((a) => ({
          id: nuevoId(),
          tipo: a.tipo,
          titulo: resumir(a.titulo),
          detalle: a.detalle ? resumir(a.detalle, 300) : undefined,
          creado_en: ahora,
          leida: opciones.silencioso === true,
          veces: 1,
          origen: 'negocio' as const,
          clave: a.clave,
          href: a.href,
        }))

      // Las alertas que ya no aplican se retiran solas del panel.
      const proceso = state.items.filter((n) => n.origen === 'proceso')
      const items = recortar([
        ...nuevas,
        ...existentes.filter((n) => n.clave && vigentes.has(n.clave)),
        ...proceso,
      ])

      if (nuevas.length === 0 && items.length === proceso.length + existentes.length) {
        return state
      }

      return { items, sinLeer: contar(items) }
    })
  },

  marcarTodasLeidas: () =>
    set((state) => {
      if (state.sinLeer === 0) return state
      const items = state.items.map((n) => ({ ...n, leida: true }))
      return { items, sinLeer: 0 }
    }),

  marcarLeida: (id) =>
    set((state) => {
      const items = state.items.map((n) => (n.id === id ? { ...n, leida: true } : n))
      return { items, sinLeer: contar(items) }
    }),

  eliminar: (id) =>
    set((state) => {
      const items = state.items.filter((n) => n.id !== id)
      return { items, sinLeer: contar(items) }
    }),

  limpiar: () => set({ items: [], sinLeer: 0 }),

  podar: () =>
    set((state) => {
      const ahora = Date.now()
      const items = state.items.filter((n) => {
        const ttl = n.origen === 'negocio' ? TTL_NEGOCIO_MS : TTL_POR_TIPO[n.tipo]
        return ahora - n.creado_en < ttl
      })
      if (items.length === state.items.length) return state
      return { items, sinLeer: contar(items) }
    }),
}))

/** Marcador para el texto relativo del panel. */
export function tiempoRelativo(creadoEn: number, ahora: number): string {
  const segundos = Math.max(0, Math.floor((ahora - creadoEn) / 1000))
  if (segundos < 60) return 'hace un momento'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}
