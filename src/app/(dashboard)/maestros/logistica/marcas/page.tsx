'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'

interface Marca {
  id: number
  codigo: string
  descripcion: string
  abreviatura?: string | null
  activo: boolean
}

export default function MarcasPage() {
  const router = useRouter()
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  const fetchMarcas = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/marcas?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setMarcas(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar marcas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarcas()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/maestros/logistica/marcas/nuevo')
  }

  const handleEdit = (marca: Marca) => {
    router.push(`/maestros/logistica/marcas/editar/${marca.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar esta marca?')) return
    try {
      const res = await apiFetch('/api/marcas', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success('Marca desactivada')
        fetchMarcas()
      }
    } catch (error) {
      toast.error('Error al desactivar marca')
    }
  }

  const columns: Column<Marca>[] = [
    { 
      key: 'codigo', 
      header: 'ID',
      width: 'w-24',
      render: (m: Marca) => <span className="text-slate-500 font-mono text-xs">{m.codigo}</span>
    },
    { 
      key: 'descripcion', 
      header: 'DESCRIPCIÓN DE LA MARCA',
      render: (m: Marca) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
            <span className="text-[11px] font-black text-primary uppercase tracking-tighter">
              {m.abreviatura || m.codigo.substring(0, 2)}
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">{m.descripcion}</span>
        </div>
      )
    },
    { 
      key: 'activo', 
      header: 'ESTADO',
      render: (m: Marca) => (
        <Badge variant={m.activo ? 'success' : 'neutral'}>
          {m.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (m: Marca) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleEdit(m)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
            title="Editar"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={() => handleDelete(m.id)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            title="Desactivar"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Marcas" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Marcas
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra las marcas de productos para tu inventario.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Nueva Marca
          </button>
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
            data={marcas}
            loading={loading}
            emptyMessage="No se encontraron marcas registradas"
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
