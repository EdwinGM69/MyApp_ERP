'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface EstadoStock {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
}

export default function EstadosStockPage() {
  const [data, setData] = useState<EstadoStock[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const permisos = usePermisos()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await apiFetch(`/api/logistica/estados-stock?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    router.push('/maestros/estados-stock/nuevo')
  }

  function openEdit(e: EstadoStock) {
    router.push(`/maestros/estados-stock/editar/${e.id}`)
  }

  async function handleDelete(e: EstadoStock) {
    if (!confirm(`¿Desactivar estado de stock "${e.codigo} - ${e.descripcion}"?`)) return
    const res = await apiFetch('/api/logistica/estados-stock', { method: 'DELETE', body: JSON.stringify({ id: e.id }) })
    if (res.ok) { 
        toast.success('Estado de stock desactivado')
        fetchData() 
    } else {
        toast.error('Error al desactivar')
    }
  }

  const columns = [
    { key: 'codigo', header: 'Código', width: 'w-32' },
    { key: 'descripcion', header: 'Descripción' },
    {
      key: 'activo',
      header: 'Estado',
      width: 'w-24',
      render: (r: EstadoStock) => <Badge variant={r.activo ? 'success' : 'error'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-20',
      render: (r: EstadoStock) => (
        <div className="flex items-center gap-1">
          {permisos.editar && (
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors">
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors">
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Estados de Stock" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Estados de Stock
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra los estados posibles para el inventario de materiales.
            </p>
          </div>
          {permisos.crear && (
            <button onClick={openCreate}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Estado
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por código o descripción..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition" />
          </div>
        </div>

        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron estados de stock" />
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPage={setPage}
          pageSize={pageSize} onPageSize={(s) => { setPageSize(s); setPage(1) }} total={total} />
      </div>
    </div>
  )
}
