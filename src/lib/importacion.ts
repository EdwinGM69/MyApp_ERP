'use client'

import { createElement } from 'react'
import toast from 'react-hot-toast'
import { useNotificaciones, SIN_NOTIFICAR } from '@/lib/notificaciones'

/** Cuántos errores caben en el toast antes de resumir. */
const MAX_EN_TOAST = 5

export interface ErrorImportacion {
  row?: number
  codigo?: string
  descripcion?: string
  error?: string
  issues?: string | string[]
}

/** Normaliza las dos formas de error que devuelven las rutas de importación. */
export function lineaErrorImportacion(e: ErrorImportacion): string {
  const motivo =
    typeof e.issues === 'string' ? e.issues : Array.isArray(e.issues) ? e.issues.join('; ') : ''
  const texto = e.error || motivo || 'Error desconocido'
  const fila = e.row != null ? `Fila ${e.row}: ` : ''
  return `${fila}${e.codigo ? `[${e.codigo}] ` : ''}${texto}`
}

/**
 * Avisa el resultado de una importación en los dos canales, con el detalle que
 * corresponde a cada uno.
 *
 * El toast es un aviso pasajero: alcanza con los primeros errores y vive 6
 * segundos. La notificación del centro es el registro consultable, así que
 * guarda la lista completa —sin tope— para poder leerla y copiarla entera.
 *
 * Vivir aquí evita cinco copias del mismo bloque en las páginas de importación,
 * que además se desincronizarían entre sí en cuanto cambiara el formato.
 */
export function notificarErrorImportacion(errores: ErrorImportacion[]): number {
  if (!errores?.length) return 0

  const lineas = errores.map(lineaErrorImportacion)

  const resumen = lineas.slice(0, MAX_EN_TOAST)
  if (lineas.length > MAX_EN_TOAST) {
    resumen.push(`... y ${lineas.length - MAX_EN_TOAST} error(es) más.`)
  }

  toast.error(
    createElement(
      'div',
      null,
      createElement('strong', null, 'Errores de importación:'),
      ...resumen.map((m, i) => createElement('div', { key: i, className: 'text-sm' }, m))
    ),
    {
      duration: 6000,
      // La entrada del centro se crea abajo, con la lista completa. Sin esta
      // marca el bridge copiaría también este resumen y el usuario vería el
      // mismo aviso dos veces.
      [SIN_NOTIFICAR]: true,
    }
  )

  useNotificaciones.getState().registrar('error', 'Errores de importación', {
    detalle: lineas.join('\n'),
  })

  return errores.length
}