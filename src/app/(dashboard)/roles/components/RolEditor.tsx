'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ModuloInfo {
  id: number
  codigo: string
  descripcion: string
  icono: string | null
}

interface OpcionMenuItem {
  id: number
  parent_id: number | null
  codigo: string
  descripcion: string
  ruta: string | null
  orden: number
  modulo_id: number
  modulo: ModuloInfo
}

interface PermisoItem {
  opcion_menu_id: number
  visualizar: boolean
  crear: boolean
  editar: boolean
  borrar: boolean
  exportar: boolean
  importar: boolean
  abrir_cerrar_caja: boolean
}

type PermisoFields = keyof Omit<PermisoItem, 'opcion_menu_id'>

const PERMISO_LABELS: Record<PermisoFields, string> = {
  visualizar: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  borrar: 'Borrar',
  exportar: 'Exportar',
  importar: 'Importar',
  abrir_cerrar_caja: 'Caja',
}

interface RolEditorProps {
  rol?: {
    id: number
    nombre: string
    descripcion: string | null
    sistema: boolean
    activo: boolean
  } | null
  onCancel: () => void
  onSuccess: () => void
}

function buildDepthMap(items: OpcionMenuItem[]): Map<number, number> {
  const depthMap = new Map<number, number>()
  const itemMap = new Map(items.map(i => [i.id, i]))

  function getDepth(id: number): number {
    if (depthMap.has(id)) return depthMap.get(id)!
    const item = itemMap.get(id)
    if (!item || item.parent_id === null) {
      depthMap.set(id, 0)
      return 0
    }
    const depth = getDepth(item.parent_id) + 1
    depthMap.set(id, depth)
    return depth
  }

  items.forEach(item => getDepth(item.id))
  return depthMap
}

function flattenTree(items: OpcionMenuItem[]): { item: OpcionMenuItem; depth: number }[] {
  const depthMap = buildDepthMap(items)
  const itemMap = new Map(items.map(i => [i.id, i]))
  const childrenMap = new Map<number | null, OpcionMenuItem[]>()
  items.forEach(item => {
    const key = item.parent_id
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(item)
  })

  const result: { item: OpcionMenuItem; depth: number }[] = []
  function walk(parentId: number | null) {
    const children = childrenMap.get(parentId) || []
    children.sort((a, b) => a.orden - b.orden)
    for (const child of children) {
      result.push({ item: child, depth: depthMap.get(child.id) || 0 })
      walk(child.id)
    }
  }
  walk(null)
  return result
}

export default function RolEditor({ rol, onCancel, onSuccess }: RolEditorProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)

  const [opcionesMenu, setOpcionesMenu] = useState<OpcionMenuItem[]>([])
  const [permisos, setPermisos] = useState<Record<number, PermisoItem>>({})

  useEffect(() => {
    async function loadData() {
      setInitialLoading(true)
      try {
        const [menuRes, permRes] = await Promise.all([
          apiFetch('/api/opciones-menu'),
          rol ? apiFetch(`/api/permisos?rol_id=${rol.id}`) : Promise.resolve(null),
        ])

        if (menuRes.ok) {
          const json = await menuRes.json()
          setOpcionesMenu(json.data || [])
        }

        if (permRes && permRes.ok) {
          const json = await permRes.json()
          const permMap: Record<number, PermisoItem> = {}
          ;(json.data || []).forEach((p: PermisoItem) => {
            permMap[p.opcion_menu_id] = p
          })
          setPermisos(permMap)
        }
      } catch (err) {
        console.error('Error loading editor data:', err)
      } finally {
        setInitialLoading(false)
      }
    }

    if (rol) {
      setNombre(rol.nombre)
      setDescripcion(rol.descripcion || '')
      setActivo(rol.activo)
    } else {
      setNombre('')
      setDescripcion('')
      setActivo(true)
      setPermisos({})
    }

    loadData()
  }, [rol])

  const groupedMenu = useMemo(() => {
    const groups: Record<number, { modulo: ModuloInfo; items: { item: OpcionMenuItem; depth: number }[] }> = {}
    const tree = flattenTree(opcionesMenu)
    for (const entry of tree) {
      const mId = entry.item.modulo.id
      if (!groups[mId]) {
        groups[mId] = { modulo: entry.item.modulo, items: [] }
      }
      groups[mId].items.push(entry)
    }
    return Object.values(groups).sort((a, b) => a.modulo.id - b.modulo.id)
  }, [opcionesMenu])

  function getPermiso(menuId: number): PermisoItem {
    return permisos[menuId] || { opcion_menu_id: menuId, visualizar: false, crear: false, editar: false, borrar: false, exportar: false, importar: false, abrir_cerrar_caja: false }
  }

  function togglePermiso(menuId: number, field: PermisoFields) {
    setPermisos(prev => {
      const current = prev[menuId] || { opcion_menu_id: menuId, visualizar: false, crear: false, editar: false, borrar: false, exportar: false, importar: false, abrir_cerrar_caja: false }
      return {
        ...prev,
        [menuId]: { ...current, [field]: !current[field] }
      }
    })
  }

  function toggleAll(items: { item: OpcionMenuItem }[], field: PermisoFields) {
    const allChecked = items.every(entry => getPermiso(entry.item.id)[field])
    setPermisos(prev => {
      const next = { ...prev }
      for (const entry of items) {
        const current = next[entry.item.id] || { opcion_menu_id: entry.item.id, visualizar: false, crear: false, editar: false, borrar: false, exportar: false, importar: false, abrir_cerrar_caja: false }
        next[entry.item.id] = { ...current, [field]: !allChecked }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre del rol es requerido')
      return
    }

    setLoading(true)
    try {
      let rolId: number

      if (rol) {
        const res = await apiFetch(`/api/roles/${rol.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Error al actualizar rol')
        }
        const json = await res.json()
        rolId = json.data.id
      } else {
        const res = await apiFetch('/api/roles', {
          method: 'POST',
          body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Error al crear rol')
        }
        const json = await res.json()
        rolId = json.data.id
      }

      const permisosPayload = opcionesMenu
        .filter(m => {
          const p = getPermiso(m.id)
          return p.visualizar || p.crear || p.editar || p.borrar || p.exportar || p.importar || p.abrir_cerrar_caja
        })
        .map(m => getPermiso(m.id))

      const permRes = await apiFetch('/api/permisos', {
        method: 'PUT',
        body: JSON.stringify({ rol_id: rolId, permisos: permisosPayload }),
      })
      if (!permRes.ok) {
        throw new Error('Error al guardar permisos')
      }

      toast.success(rol ? 'Rol actualizado exitosamente' : 'Rol creado exitosamente')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error desconocido al guardar')
    } finally {
      setLoading(false)
    }
  }

  const permisoFields: PermisoFields[] = ['visualizar', 'crear', 'editar', 'borrar', 'exportar', 'importar', 'abrir_cerrar_caja']

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
            {rol ? 'Actualizar Rol' : 'Nuevo Rol'}
          </h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Gestión de Roles y Permisos</p>
        </div>
        <button
          onClick={onCancel}
          className="size-11 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Rol *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Ej: Administrador"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Descripción del rol"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Rol Activo</p>
            <p className="text-xs font-medium text-slate-500">Los usuarios asignados heredarán los permisos de este rol</p>
          </div>
          <input
            type="checkbox"
            checked={activo}
            onChange={e => setActivo(e.target.checked)}
            className="w-5 h-5 border-2 border-slate-300 rounded-lg cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-all"
          />
        </div>

        {rol?.sistema && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Este es un rol de sistema. Algunos campos pueden estar restringidos.
            </p>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Permisos del Rol</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Define los permisos específicos para cada opción del menú
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[240px]">
                    Opción de Menú
                  </th>
                  {permisoFields.map(field => (
                    <th key={field} className="px-2 py-3 text-center min-w-[72px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {PERMISO_LABELS[field]}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const allItems = groupedMenu.flatMap(g => g.items)
                            toggleAll(allItems, field)
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-wider"
                        >
                          {groupedMenu.flatMap(g => g.items).every(entry => getPermiso(entry.item.id)[field]) ? 'Off' : 'On'}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedMenu.map(group => (
                  <Fragment key={`group-${group.modulo.id}`}>
                    <tr className="bg-slate-200/50 dark:bg-slate-800/30">
                      <td
                        colSpan={permisoFields.length + 1}
                        className="px-5 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">{group.modulo.icono || 'folder'}</span>
                          {group.modulo.descripcion}
                        </div>
                      </td>
                    </tr>
                    {group.items.map(entry => {
                      const perm = getPermiso(entry.item.id)
                      const hasChildren = opcionesMenu.some(m => m.parent_id === entry.item.id)
                      return (
                        <tr
                          key={entry.item.id}
                          className={cn(
                            'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-colors',
                            entry.depth > 0 && 'text-slate-500'
                          )}
                        >
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2" style={{ paddingLeft: `${entry.depth * 20}px` }}>
                              {hasChildren && (
                                <span className="material-symbols-outlined text-base text-slate-400 shrink-0">subdirectory_arrow_right</span>
                              )}
                              <span className={cn(
                                'text-sm font-medium',
                                entry.item.ruta === null ? 'font-bold text-slate-700 dark:text-slate-300' : ''
                              )}>
                                {entry.item.descripcion}
                              </span>
                            </div>
                          </td>
                          {permisoFields.map(field => (
                            <td key={field} className="px-2 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={perm[field]}
                                onChange={() => togglePermiso(entry.item.id, field)}
                                className="w-4 h-4 border-2 border-slate-300 rounded cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-all"
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 px-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-48 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
            ) : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
