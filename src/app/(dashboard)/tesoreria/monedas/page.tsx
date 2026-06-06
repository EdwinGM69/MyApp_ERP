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

interface Moneda {
  id: number
  descripcion: string
  abreviatura: string
  simbolo: string
  activo: boolean
}

export default function MonedasPage() {
  const router = useRouter()
  const [monedas, setMonedas] = useState<Moneda[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const permisos = usePermisos()

  const fetchMonedas = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/monedas?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setMonedas(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar monedas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonedas()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/tesoreria/monedas/nuevo')
  }

  const handleEdit = (moneda: Moneda) => {
    router.push(`/tesoreria/monedas/editar/${moneda.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar esta moneda?')) return
    try {
      const res = await apiFetch('/api/monedas', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success('Moneda desactivada')
        fetchMonedas()
      }
    } catch (error) {
      toast.error('Error al desactivar moneda')
    }
  }

  const columns: Column<Moneda>[] = [
    { 
      key: 'abreviatura', 
      header: 'CÓDIGO',
      width: 'w-24',
      render: (m: Moneda) => <span className="text-slate-500 font-mono text-xs">{m.abreviatura}</span>
    },
    { 
      key: 'descripcion', 
      header: 'DESCRIPCIÓN DE LA MONEDA',
      render: (m: Moneda) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-sm">
            <span className="text-sm font-black text-blue-600 uppercase tracking-tighter">
              {m.simbolo}
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">{m.descripcion}</span>
        </div>
      )
    },
    { 
      key: 'activo', 
      header: 'ESTADO',
      render: (m: Moneda) => (
        <Badge variant={m.activo ? 'success' : 'neutral'}>
          {m.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (m: Moneda) => (
        <div className="flex items-center gap-1 justify-end">
          {permisos.editar && (
            <button
              onClick={() => handleEdit(m)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(m.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
              title="Desactivar"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Monedas" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Monedas
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra las monedas disponibles para tu empresa.
            </p>
          </div>
          {permisos.crear && (
            <button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Nueva Moneda
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={monedas}
            loading={loading}
            emptyMessage="No se encontraron monedas registradas"
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
