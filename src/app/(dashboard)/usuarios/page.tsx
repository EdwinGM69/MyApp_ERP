'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import UsuarioDetailView from './components/UsuarioDetailView'
import UsuarioEditor from './components/UsuarioEditor'

interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  posicion?: string | null
  is_superadmin: boolean
  two_factor_enabled: boolean
  preferencias?: any
  rol_id: number
  rol: {
    id: number
    nombre: string
  }
  roles_adicionales?: {
    rol_id: number
    rol: {
      nombre: string
    }
  }[]
  activo: boolean
  avatar_url?: string | null
  updated_at: string
  usuario_sucursales?: { sucursal_id: number; sucursal?: { id: number; descripcion: string } }[]
}

export default function UsuariosPage() {
  // Master List State
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection State
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Usuario | null>(null)

  // Editor State
  const [isEditing, setIsEditing] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)

  // Fetch List
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const res = await apiFetch(`/api/usuarios?${params}`)
      const json = await res.json()
      setUsuarios(json.data || [])

      // Auto-select first user if none selected and we have data
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      } else if (!json.data?.length) {
        setSelectedId(null)
        setSelected(null)
      }
    } catch (err) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingMaster(false)
    }
  }, [search, selectedId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      setSelected(usuarios.find(u => u.id === selectedId) || null)
    }
  }, [selectedId, usuarios])

  const handleSelectUser = (usuario: Usuario) => {
    setSelectedId(usuario.id)
    setSelected(usuario)
    setIsEditing(false)
  }

  const handleOpenNew = () => {
    setEditingUser(null)
    setIsEditing(true)
  }

  const handleOpenEdit = (usuario: Usuario) => {
    setEditingUser(usuario)
    setIsEditing(true)
  }

  const handleCloseEditor = () => {
    setIsEditing(false)
    setEditingUser(null)
  }

  const handleSaveSuccess = () => {
    setIsEditing(false)
    setEditingUser(null)
    fetchList()
  }

  const handleDelete = async (usuario: Usuario) => {
    if (!confirm(`¿Está seguro de que desea desactivar al usuario ${usuario.nombre}?`)) return
    try {
      const res = await apiFetch(`/api/usuarios/${usuario.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al desactivar usuario')
      }
      toast.success('Usuario desactivado exitosamente')
      fetchList()

      // If deleted user was selected, clear selection
      if (selectedId === usuario.id) {
        setSelectedId(null)
        setSelected(null)
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toISOString().replace('T', ' ').substring(0, 16)
  }

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1) * 16777215).toString(16);
    return '#' + '000000'.substring(0, 6 - color.length) + color;
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Gestión de Usuarios" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Listado Maestro</h3>
              <button
                onClick={handleOpenNew}
                className="size-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm outline-none shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
            {loadingMaster ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs font-medium uppercase tracking-widest">Cargando...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <span className="text-xs font-medium">No se encontraron usuarios</span>
              </div>
            ) : usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className={cn(
                  "relative group cursor-pointer",
                  selectedId === usuario.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30"
                )}
              >
                <button
                  onClick={() => handleSelectUser(usuario)}
                  className="w-full p-4 text-left transition-all rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors font-black text-xs",
                      selectedId === usuario.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {usuario.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        "text-sm font-bold block truncate tracking-tight transition-colors",
                        selectedId === usuario.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                      )}>
                        {usuario.nombre}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                        {usuario.email} · {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Delete button - only show on hover or when selected */}
                {usuario.activo && (selectedId === usuario.id || true) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(usuario)
                    }}
                    className="absolute top-2 right-2 size-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Desactivar usuario"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-10">
          {isEditing ? (
            <UsuarioEditor
              usuario={editingUser}
              onCancel={handleCloseEditor}
              onSuccess={handleSaveSuccess}
            />
          ) : selected ? (
            <UsuarioDetailView usuario={selected} onEdit={() => handleOpenEdit(selected)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">person</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Gestión de Usuarios</p>
                <p className="text-xs font-medium text-slate-400 italic">Selecciona un usuario para visualizar su información.</p>
                <p className="text-xs font-medium text-slate-400 italic mt-1">O crea uno nuevo usando el botón +</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
