'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'

interface TipoCambio {
  id: number
  moneda_base_rel: { id: number; descripcion: string; abreviatura: string; simbolo: string }
  moneda_cotizada_rel: { id: number; descripcion: string; abreviatura: string; simbolo: string }
  precio_compra: string
  precio_venta: string
  fuente?: { id: number; nombre: string }
  inicio_vigencia?: string | null
  fin_vigencia?: string | null
  activo: boolean
}

export default function TipoCambioPage() {
  const router = useRouter()
  const [tiposCambio, setTiposCambio] = useState<TipoCambio[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  const fetchTiposCambio = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/tipo-cambio?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setTiposCambio(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar tipos de cambio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTiposCambio()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/tesoreria/tipo-cambio/nuevo')
  }

  const handleEdit = (tipoCambio: TipoCambio) => {
    router.push(`/tesoreria/tipo-cambio/editar/${tipoCambio.id}`)
  }

  /*
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este tipo de cambio?')) return
    try {
      const res = await apiFetch('/api/tipo-cambio', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success('Tipo de cambio desactivado')
        fetchTiposCambio()
      }
    } catch (error) {
      toast.error('Error al desactivar tipo de cambio')
    }
  }
  */

  const columns: Column<TipoCambio>[] = [
    {
      key: 'monedas',
      header: 'MONEDAS',
      render: (tc: TipoCambio) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white">{tc.moneda_base_rel.abreviatura}</span>
          <span className="text-slate-400 text-xs">→</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{tc.moneda_cotizada_rel.abreviatura}</span>
        </div>
      )
    },
    {
      key: 'precio_compra',
      header: 'COMPRA',
      render: (tc: TipoCambio) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {tc.moneda_base_rel.simbolo}{Number(tc.precio_compra).toFixed(5)}
        </span>
      )
    },
    {
      key: 'precio_venta',
      header: 'VENTA',
      render: (tc: TipoCambio) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {tc.moneda_base_rel.simbolo}{Number(tc.precio_venta).toFixed(5)}
        </span>
      )
    },
    {
      key: 'fuente',
      header: 'FUENTE',
      render: (tc: TipoCambio) => (
        <span className="text-xs text-slate-500">{tc.fuente?.nombre || '--'}</span>
      )
    },
    {
      key: 'inicio_vigencia',
      header: 'INICIO VIGENCIA',
      render: (tc: TipoCambio) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {tc.inicio_vigencia ? new Date(tc.inicio_vigencia).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '--'}
        </span>
      )
    },
    {
      key: 'fin_vigencia',
      header: 'FIN VIGENCIA',
      render: (tc: TipoCambio) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {tc.fin_vigencia ? new Date(tc.fin_vigencia).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '--'}
        </span>
      )
    },
    {
      key: 'activo',
      header: 'ESTADO',
      render: (tc: TipoCambio) => (
        <Badge variant={tc.fin_vigencia === null ? 'success' : 'neutral'}>
          {tc.fin_vigencia === null ? '● Vigente' : '● No Vigente'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (tc: TipoCambio) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleEdit(tc)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
            title="Editar"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Tipo de Cambio" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Tipo de Cambio
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra los tipos de cambio de tu empresa.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Nuevo Tipo de Cambio
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por moneda..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={tiposCambio}
            loading={loading}
            emptyMessage="No se encontraron tipos de cambio registrados"
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
