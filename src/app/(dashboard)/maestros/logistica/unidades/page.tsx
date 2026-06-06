'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { usePermisos } from '@/contexts/PermisosContext'

interface Unidad {
  id: number
  abreviatura: string
  descripcion: string
  unidad_multiplo: number
  activo: boolean
}

export default function UnidadesPage() {
  const router = useRouter()
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const permisos = usePermisos()

  const fetchUnidades = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/logistica/unidades?page=${page}&pageSize=${pageSize}&search=${search}`)
      if (!res.ok) throw new Error('Error al obtener unidades')
      const json = await res.json()
      setUnidades(json.data)
      setTotal(json.total)
    } catch (error) {
      toast.error('Error al cargar unidades de medida')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnidades()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, search])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar esta unidad de medida?')) return
    try {
      const res = await apiFetch(`/api/logistica/unidades?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al desactivar')
      toast.success('Unidad de medida desactivada')
      fetchUnidades()
    } catch (error) {
      toast.error('Error al desactivar unidad')
    }
  }

  const columns: Column<Unidad>[] = [
    {
      key: 'abreviatura',
      header: 'Abreviatura',
      render: (item: Unidad) => (
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg text-xs">
          {item.abreviatura}
        </span>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: Unidad) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 dark:text-slate-200">{item.descripcion}</span>
        </div>
      )
    },
    {
      key: 'unidad_multiplo',
      header: 'Múltiplo',
      align: 'center',
      render: (item: Unidad) => (
        <span className="text-xs font-medium text-slate-500">{item.unidad_multiplo}</span>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Unidad) => (
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
          item.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        )}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (item: Unidad) => (
        <div className="flex items-center justify-end gap-2">
          {permisos.editar && (
            <button
              onClick={() => router.push(`/maestros/logistica/unidades/editar/${item.id}`)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
              title="Editar"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(item.id)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
              title="Desactivar"
            >
              <span className="material-symbols-outlined text-[20px]">block</span>
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Unidades de Medida" />
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar por descripción o abreviatura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            
            {permisos.crear && (
              <button
                onClick={() => router.push('/maestros/logistica/unidades/nuevo')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nueva Unidad
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={unidades}
            loading={loading}
            emptyMessage="No se encontraron unidades de medida"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize)}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={() => {}} // Handle it if needed
            total={total}
          />
          </div>
        </div>
      </div>
    </div>
  )
}
