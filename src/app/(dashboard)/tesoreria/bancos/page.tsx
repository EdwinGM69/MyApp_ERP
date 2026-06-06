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

interface Banco {
  id: number
  codigo: string
  descripcion: string
  pais?: { descripcion: string }
  codigo_swift?: string
  activo: boolean
}

export default function BancosPage() {
  const router = useRouter()
  const permisos = usePermisos()
  const [bancos, setBancos] = useState<Banco[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  const fetchBancos = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/tesoreria/bancos?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setBancos(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar bancos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBancos()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/tesoreria/bancos/nuevo')
  }

  const handleEdit = (banco: Banco) => {
    router.push(`/tesoreria/bancos/editar/${banco.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este banco?')) return
    try {
      const res = await apiFetch('/api/tesoreria/bancos', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success('Banco desactivado')
        fetchBancos()
      }
    } catch (error) {
      toast.error('Error al desactivar banco')
    }
  }

  const columns: Column<Banco>[] = [
    { 
      key: 'id', 
      header: 'ID',
      width: 'w-16',
      render: (b) => <span className="text-slate-500 font-mono text-[10px]">{b.id}</span>
    },
    { 
      key: 'descripcion', 
      header: 'BANCO / ENTIDAD',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-sm">
            <span className="material-symbols-outlined text-sm font-black text-indigo-600 uppercase tracking-tighter">
              account_balance
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{b.descripcion}</div>
            <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-2">
              <span>Cód: {b.codigo}</span>
              {b.pais && (
                <>
                  <span className="text-[8px]">•</span>
                  <span>{b.pais.descripcion}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )
    },
    { 
      key: 'codigo_swift', 
      header: 'SWIFT',
      width: 'w-32',
      render: (b) => <span className="font-black text-slate-900 dark:text-white tracking-widest text-xs">{b.codigo_swift || '--'}</span>
    },
    { 
      key: 'activo', 
      header: 'ESTADO',
      width: 'w-32',
      render: (b) => (
        <Badge variant={b.activo ? 'success' : 'neutral'}>
          {b.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      width: 'w-28',
      render: (b) => (
        <div className="flex items-center gap-1 justify-end">
          {permisos.editar && (
            <button
              onClick={() => handleEdit(b)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(b.id)}
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
      <Topbar title="Gestión de Bancos" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Gestión de Bancos
            </h3>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Gestione las entidades bancarias y sus configuraciones.
            </p>
          </div>
          {permisos.crear && (
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0 active:scale-95 text-sm"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Banco
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition shadow-sm font-medium"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={bancos}
            loading={loading}
            emptyMessage="No se encontraron bancos registrados"
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
