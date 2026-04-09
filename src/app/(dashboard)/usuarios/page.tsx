'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import Pagination from '@/components/ui/Pagination'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Rol {
  id: number
  nombre: string
}

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
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        pageSize: String(pageSize),
      })
      const res = await apiFetch(`/api/usuarios?${params}`)
      if (!res.ok) throw new Error('Error fetching users')
      const json = await res.json()
      setUsuarios(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

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
      fetchUsuarios()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (usuario: Usuario) => {
    router.push(`/usuarios/editar/${usuario.id}`)
  }

  const handleOpenNew = () => {
    router.push('/usuarios/nuevo')
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    // return format like 2023-10-24 08:30
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Gestión de Usuarios" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
        <div className="max-w-[1200px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Administra los accesos y perfiles de los miembros de tu organización.</p>
            </div>
            <button 
              onClick={handleOpenNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Agregar Nuevo Usuario
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">FOTO</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">NOMBRE COMPLETO</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">EMAIL</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">ROL</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">ESTADO</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white">ÚLTIMA CONEXIÓN</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right bg-white">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-medium">Cargando usuarios...</td>
                    </tr>
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-medium">No se encontraron usuarios.</td>
                    </tr>
                  ) : usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-400">#{String(usuario.id).padStart(3, '0')}</span>
                      </td>
                      <td className="px-6 py-4">
                        {usuario.avatar_url ? (
                          <img src={usuario.avatar_url} alt={usuario.nombre} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: stringToColor(usuario.nombre) }}
                          >
                            {usuario.nombre.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800">{usuario.nombre}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 font-medium">{usuario.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                          {usuario.rol?.nombre || 'Sin Rol'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
                          usuario.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", usuario.activo ? "bg-emerald-500" : "bg-slate-400")} />
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-sm font-medium",
                          usuario.activo ? "text-slate-400" : "text-slate-400"
                        )}>
                          {formatDate(usuario.updated_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(usuario)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg" 
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(usuario)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg" 
                            title="Desactivar"
                            disabled={!usuario.activo}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Custom */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-500">
                Mostrando <span className="font-bold text-slate-700">{Math.min(1 + (page - 1) * pageSize, total)}</span> - <span className="font-bold text-slate-700">{Math.min(page * pageSize, total)}</span> de <span className="font-bold text-slate-700">{total}</span> usuarios
              </div>
              <Pagination 
                page={page} 
                totalPages={Math.ceil(total / pageSize)} 
                onPage={setPage}
                pageSize={pageSize} 
                onPageSize={(s) => { setPageSize(s); setPage(1) }} 
                total={total} 
              />
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
