'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface EsquemaCalculo {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
}

export default function EsquemasCalculoPage() {
  const router = useRouter()
  const [data, setData] = useState<EsquemaCalculo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const permisos = usePermisos()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
      const res = await apiFetch(`/api/esquemas-calculo?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar esquemas de cálculo')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    router.push('/maestros/comercial/esquemas-calculo/nuevo')
  }

  function openEdit(e: EsquemaCalculo) {
    router.push(`/maestros/comercial/esquemas-calculo/editar/${e.id}`)
  }

  async function handleDelete(e: EsquemaCalculo) {
    if (!confirm(`¿Desactivar el esquema "${e.codigo} - ${e.descripcion}"?`)) return
    try {
      const res = await apiFetch('/api/esquemas-calculo', { method: 'DELETE', body: JSON.stringify({ id: e.id }) })
      if (res.ok) { 
          toast.success('Esquema desactivado')
          fetchData() 
      }
    } catch (error) {
        toast.error('Error al desactivar esquema')
    }
  }

  const columns = [
    { 
      key: 'codigo', 
      header: 'CÓDIGO', 
      width: 'w-32',
      render: (r: EsquemaCalculo) => <span className="font-mono text-xs font-bold text-slate-500">{r.codigo}</span>
    },
    { key: 'descripcion', header: 'DESCRIPCIÓN' },
    {
      key: 'activo',
      header: 'ESTADO',
      width: 'w-24',
      render: (r: EsquemaCalculo) => <Badge variant={r.activo ? 'success' : 'neutral'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right' as const,
      width: 'w-24',
      render: (r: EsquemaCalculo) => (
        <div className="flex items-center gap-1 justify-end">
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
      <Topbar title="Esquemas de Cálculo" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Esquemas de Cálculo
            </h3>
            <p className="text-slate-500 text-sm mt-3 font-medium">
              Gestione los flujos de cálculo comercial para ventas y compras.
            </p>
          </div>
          {permisos.crear && (
            <button onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 shrink-0">
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Nuevo Esquema
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por código o descripción..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron esquemas de cálculo" />
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPage={setPage}
              pageSize={pageSize} onPageSize={(s) => { setPageSize(s); setPage(1) }} total={total} />
          </div>
        </div>
      </div>
    </div>
  )
}
