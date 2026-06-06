'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export interface PermisoPagina {
  opcion_menu_id: number
  ruta: string | null
  visualizar: boolean
  crear: boolean
  editar: boolean
  borrar: boolean
  exportar: boolean
  importar: boolean
  abrir_cerrar_caja: boolean
}

interface PermisosContextType {
  /** Lista completa de permisos del usuario (todos los menús) */
  permisos: PermisoPagina[]
  /** Devuelve los permisos para una ruta específica (o null si no existe) */
  getPermisosPorRuta: (ruta: string) => PermisoPagina | null
  /** true mientras se carga la primera vez */
  loading: boolean
  /** Recarga los permisos desde el servidor */
  refresh: () => Promise<void>
}

// Permisos por defecto: todo denegado
const PERMISOS_DENEGADOS: Omit<PermisoPagina, 'opcion_menu_id' | 'ruta'> = {
  visualizar: false,
  crear: false,
  editar: false,
  borrar: false,
  exportar: false,
  importar: false,
  abrir_cerrar_caja: false,
}

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------

const PermisosContext = createContext<PermisosContextType | undefined>(undefined)

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

interface PermisosProviderProps {
  children: ReactNode
}

export function PermisosProvider({ children }: PermisosProviderProps) {
  const [permisos, setPermisos] = useState<PermisoPagina[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPermisos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/mis-permisos')
      if (!res.ok) return
      const data = await res.json()
      setPermisos(data.permisos ?? [])
    } catch {
      // Silencioso — se queda con lista vacía (sin permisos)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermisos()
  }, [fetchPermisos])

  /**
   * Busca los permisos para una ruta dada.
   * Usa coincidencia exacta primero; si no, coincidencia por prefijo
   * más específico (para rutas con parámetros dinámicos).
   */
  const getPermisosPorRuta = useCallback(
    (ruta: string): PermisoPagina | null => {
      if (!ruta) return null

      // Coincidencia exacta
      const exacto = permisos.find((p) => p.ruta === ruta)
      if (exacto) return exacto

      // Coincidencia por prefijo más largo (ej: /maestros/materiales matchea /maestros/materiales/nuevo)
      const porPrefijo = permisos
        .filter((p) => p.ruta && ruta.startsWith(p.ruta))
        .sort((a, b) => (b.ruta?.length ?? 0) - (a.ruta?.length ?? 0))

      return porPrefijo[0] ?? null
    },
    [permisos]
  )

  return (
    <PermisosContext.Provider
      value={{ permisos, getPermisosPorRuta, loading, refresh: fetchPermisos }}
    >
      {children}
    </PermisosContext.Provider>
  )
}

// ------------------------------------------------------------------
// Hooks de conveniencia
// ------------------------------------------------------------------

/**
 * Hook principal. Devuelve los permisos de la página actual (usa usePathname)
 * o de una ruta explícita si se pasa como argumento.
 *
 * @example
 * const { crear, editar, borrar } = usePermisos()
 */
export function usePermisos(rutaExplicita?: string): PermisoPagina & { loading: boolean } {
  const context = useContext(PermisosContext)
  if (!context) {
    throw new Error('usePermisos debe usarse dentro de <PermisosProvider>')
  }
  const pathname = usePathname()
  const ruta = rutaExplicita ?? pathname

  const permiso = context.getPermisosPorRuta(ruta)

  return {
    opcion_menu_id: permiso?.opcion_menu_id ?? 0,
    ruta: permiso?.ruta ?? null,
    visualizar: permiso?.visualizar ?? false,
    crear: permiso?.crear ?? false,
    editar: permiso?.editar ?? false,
    borrar: permiso?.borrar ?? false,
    exportar: permiso?.exportar ?? false,
    importar: permiso?.importar ?? false,
    abrir_cerrar_caja: permiso?.abrir_cerrar_caja ?? false,
    loading: context.loading,
  }
}

/**
 * Hook para acceder al context completo (lista, loading, refresh).
 */
export function usePermisosContext(): PermisosContextType {
  const context = useContext(PermisosContext)
  if (!context) {
    throw new Error('usePermisosContext debe usarse dentro de <PermisosProvider>')
  }
  return context
}
