'use client'

import type { ToastOptions } from 'react-hot-toast'
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

/**
 * Red de seguridad, no decisión de diseño.
 *
 * El texto se guarda completo: quien recorta es la vista, con `line-clamp` o el
 * diálogo de detalle, porque un mensaje cortado en el store es un mensaje
 * perdido para siempre. Este único corte solo evita que un texto patológico
 * del servidor (ver `LIMITE_EXPANDIBLE`) se lleve la memoria del panel.
 */
export const LIMITE_SEGURIDAD_TEXTO = 4_000

/**
 * A partir de aquí el mensaje no se expande dentro de la fila sino que se abre
 * en el diálogo de detalle: 700 caracteres ocupan más de una pantalla del panel
 * y expandirlos en línea deja la lista inutilizable.
 */
export const LIMITE_EXPANDIBLE = 700

/** ¿El mensaje necesita el diálogo de detalle en lugar de expandirse en la fila? */
export function esTextoLargo(texto: string | undefined | null): boolean {
  return normalizar(texto ?? '').length > LIMITE_EXPANDIBLE
}

/**
 * Opción de toast para los avisos que ya se registran a mano.
 *
 * El bridge copia al centro *todo* lo que pasa por `toast.error`, así que un
 * helper que además llama a `registrar` —porque necesita guardar más detalle del
 * que cabe en el toast— terminaría creando dos entradas: una con el resumen y
 * otra con la lista completa. Marcar el toast evita el par.
 */
export const SIN_NOTIFICAR = 'erpNotificar'

/**
 * Opciones de toast admitiendo la marca de arriba.
 *
 * `react-hot-toast` declara sus opciones como un `Pick` cerrado, así que el
 * objeto literal que lleva `[SIN_NOTIFICAR]` dispara el chequeo de propiedades
 * sobrantes. Ensanchar con un índice deja pasar la marca sin renunciar al
 * chequeo de `duration`, `position` o `style`, que un `as any` sí perdería.
 */
export type OpcionesToast = ToastOptions & Record<string, unknown>

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
 * Elementos cuyo salto de línea es significativo. Solo entre estos se inserta un
 * `\n` al aplanar JSX: unir siempre con `\n` partiría en dos renglones los
 * mensajes cortos con JSX inline, que son la gran mayoría.
 */
const ETIQUETAS_BLOQUE = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
  'section', 'table', 'tr', 'ul',
])

function esBloque(valor: unknown): boolean {
  const tipo = (valor as { type?: unknown })?.type
  return typeof tipo === 'string' && ETIQUETAS_BLOQUE.has(tipo)
}

/**
 * Convierte a texto plano el mensaje de un toast. La mayoría de llamadas usan
 * strings, pero hay 5 sitios de importación de datos que pasan JSX anidado.
 *
 * Los hijos de bloque se unen con salto de línea para que una lista de errores
 * siga leyéndose como lista y no como un muro de prosa.
 */
export function textoPlano(valor: unknown): string {
  if (valor == null || valor === false) return ''
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) {
    const partes = valor
      .map((hijo) => ({ texto: textoPlano(hijo), bloque: esBloque(hijo) }))
      .map((p) => ({ ...p, texto: p.texto.replace(/[^\S\n]+/g, ' ').trim() }))
      .filter((p) => p.texto)

    // El interior lleva salto solo si el vecino es un bloque: así "A" + "B"
    // inline siguen siendo una sola línea, y una lista de <div> mantiene sus
    // renglones.
    return partes
      .map((p, i) => {
        if (i === partes.length - 1) return p.texto
        const salto = p.bloque || partes[i + 1].bloque
        return salto ? `${p.texto}\n` : `${p.texto} `
      })
      .join('')
  }

  const elemento = valor as { props?: Record<string, unknown> }
  if (typeof elemento === 'object' && elemento.props) {
    const children = (elemento.props as { children?: unknown }).children
    const texto = textoPlano(children)
    if (texto) return texto
  }

  return ''
}

/**
 * Saneo de entrada, no truncado.
 *
 * Colapsa espacios horizontales, quita renglones vacíos y conserva los saltos que
 * `textoPlano` reconstruyó. Devuelve el mensaje completo salvo la red de
 * seguridad: quien recorta para mostrar es la vista, no el store.
 */
export function normalizar(texto: string, max = LIMITE_SEGURIDAD_TEXTO): string {
  const limpio = texto
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((linea) => linea.replace(/[^\S\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

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
    const titulo = normalizar(opciones.titulo || mensaje)
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
        detalle: opciones.detalle ? normalizar(opciones.detalle) : undefined,
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
          titulo: normalizar(a.titulo),
          detalle: a.detalle ? normalizar(a.detalle) : undefined,
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
