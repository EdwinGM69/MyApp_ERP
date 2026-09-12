export type AreaTrabajo = 'ventas' | 'caja' | 'inventario' | 'administracion'
export type GrupoMenu = 'operaciones' | 'configuracion'

export interface MenuItem {
  id: number
  parent_id: number | null
  label: string
  ruta: string | null
  icono?: string | null
  modulo: AreaTrabajo | null
  grupo: GrupoMenu | null
  visible_menu: boolean
  roles_permitidos: string[]
  orden: number
}

export interface AreaMeta {
  id: AreaTrabajo
  label: string
  icono: string
  seccion: 'operaciones' | 'configuracion'
  /** Ruta principal del área (si existe una página que la represente) */
  ruta_inicio: string | null
  /** Etiqueta del bloque de accesos frecuentes */
  tituloFrecuentes: string
  /** Etiqueta del bloque de configuración del módulo */
  tituloConfiguracion: string
}

export const AREAS: AreaMeta[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    icono: 'shopping_cart',
    seccion: 'operaciones',
    ruta_inicio: '/ventas',
    tituloFrecuentes: 'Frecuentes',
    tituloConfiguracion: 'Configuración comercial',
  },
  {
    id: 'caja',
    label: 'Caja',
    icono: 'account_balance_wallet',
    seccion: 'operaciones',
    ruta_inicio: '/gestion-caja',
    tituloFrecuentes: 'Frecuentes',
    tituloConfiguracion: 'Configuración',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icono: 'inventory_2',
    seccion: 'operaciones',
    ruta_inicio: '/consultas/stock',
    tituloFrecuentes: 'Frecuentes',
    tituloConfiguracion: 'Configuración',
  },
  {
    id: 'administracion',
    label: 'Administración',
    icono: 'admin_panel_settings',
    seccion: 'configuracion',
    ruta_inicio: '/empresa',
    tituloFrecuentes: 'Frecuentes',
    tituloConfiguracion: 'Configuración',
  },
]

export const AREA_MAP: Record<AreaTrabajo, AreaMeta> = AREAS.reduce(
  (acc, area) => ({ ...acc, [area.id]: area }),
  {} as Record<AreaTrabajo, AreaMeta>
)

/** Normaliza texto para búsqueda (minúsculas + sin acentos) */
export function normalizarTexto(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Devuelve el área activa según el pathname (coincidencia del prefijo de ruta más largo) */
export function areaDesdeRuta(items: MenuItem[], pathname: string): AreaTrabajo | null {
  const match = items
    .filter((i) => i.visible_menu && i.ruta && pathname.startsWith(i.ruta))
    .sort((a, b) => (b.ruta?.length ?? 0) - (a.ruta?.length ?? 0))[0]

  const area = match?.modulo ?? null
  return area && AREA_MAP[area] ? area : null
}