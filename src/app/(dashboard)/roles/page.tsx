'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import Topbar from '@/components/layout/Topbar'
import RolEditor from './components/RolEditor'
import { usePermisos } from '@/contexts/PermisosContext'

interface RolItem {
  id: number
  nombre: string
  descripcion: string | null
  sistema: boolean
  activo: boolean
}

export default function RolesPage() {
  const permisos = usePermisos()
  const [roles, setRoles] = useState<RolItem[]>([])
  const [selectedRol, setSelectedRol] = useState<RolItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/roles')
      if (res.ok) {
        const json = await res.json()
        setRoles(json.data || [])
      }
    } catch (err) {
      console.error('Error loading roles:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const filtered = roles.filter(r =>
    r.nombre.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(rol: RolItem) {
    setSelectedRol(rol)
    setCreating(false)
  }

  function handleNew() {
    setSelectedRol(null)
    setCreating(true)
  }

  function handleCancel() {
    setSelectedRol(null)
    setCreating(false)
  }

  async function handleSuccess() {
    setSelectedRol(null)
    setCreating(false)
    await loadRoles()
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
      <Topbar title="Roles y Permisos" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/20">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Roles</h2>
              {permisos.crear && (
                <button
                  onClick={handleNew}
                  className="size-8 rounded-xl bg-primary text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm material-symbols-outlined">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar rol..."
                className="w-full h-9 pl-9 pr-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs outline-none font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-medium">No se encontraron roles</p>
            ) : (
              <div className="space-y-1">
                {filtered.map(rol => (
                  <button
                    key={rol.id}
                    onClick={() => handleSelect(rol)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium',
                      selectedRol?.id === rol.id
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'size-2 rounded-full shrink-0',
                        rol.activo ? 'bg-green-400' : 'bg-red-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{rol.nombre}</p>
                        {rol.descripcion && (
                          <p className="text-[10px] opacity-70 truncate">{rol.descripcion}</p>
                        )}
                      </div>
                      {rol.sistema && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                          Sys
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {selectedRol ? (
            <RolEditor
              key={selectedRol.id}
              rol={selectedRol}
              onCancel={handleCancel}
              onSuccess={handleSuccess}
            />
          ) : creating ? (
            <RolEditor
              onCancel={handleCancel}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <span className="material-symbols-outlined text-6xl mb-4">lock</span>
              <p className="text-sm font-medium mb-1">Selecciona un rol para editar</p>
              <p className="text-xs">o crea uno nuevo usando el botón +</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
