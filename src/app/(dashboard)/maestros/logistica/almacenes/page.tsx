'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface Almacen {
  id: number
  descripcion: string
  activo: boolean
}

export default function AlmacenesPage() {
  const router = useRouter()
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const permisos = usePermisos()

  const fetchAlmacenes = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/logistica/almacenes?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setAlmacenes(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar almacenes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlmacenes()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/maestros/logistica/almacenes/nuevo')
  }

  const handleEdit = (almacen: Almacen) => {
    router.push(`/maestros/logistica/almacenes/editar/${almacen.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de cambiar el estado de este almacén?')) return
    try {
      const res = await apiFetch(`/api/logistica/almacenes?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Estado actualizado')
        fetchAlmacenes()
      }
    } catch (error) {
      toast.error('Error al actualizar estado')
    }
  }

  const columns: Column<Almacen>[] = [
    { 
      key: 'id', 
      header: 'ID',
      width: 'w-24',
      render: (a: Almacen) => <span className="text-slate-500 font-mono text-xs">#{a.id}</span>
    },
    { 
      key: 'descripcion', 
      header: 'DESCRIPCIÓN DEL ALMACÉN',
      render: (a: Almacen) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-blue-600">
              warehouse
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">{a.descripcion}</span>
        </div>
      )
    },
    { 
      key: 'activo', 
      header: 'ESTADO',
      render: (a: Almacen) => (
        <Badge variant={a.activo ? 'success' : 'neutral'}>
          {a.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (a: Almacen) => (
        <div className="flex items-center gap-1 justify-end">
          {permisos.editar && (
            <button
              onClick={() => handleEdit(a)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(a.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
              title="Cambiar Estado"
            >
              <span className="material-symbols-outlined text-base">sync_alt</span>
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Almacenes" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Almacenes
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra los almacenes de tu empresa para controlar el flujo de inventario.
            </p>
          </div>
          {permisos.crear && (
            <button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Almacén
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={almacenes}
            loading={loading}
            emptyMessage="No se encontraron almacenes registrados"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize)}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); setPage(1); }}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}
