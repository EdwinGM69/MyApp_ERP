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

interface Documento {
  id: number
  descripcion: string
  abreviatura: string
  tipo: string
  activo: boolean
  ruta_API?: string
}

export default function DocumentosIdentificacionPage() {
  const router = useRouter()
  const permisos = usePermisos()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')

  const fetchDocumentos = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/logistica/documentos-identificacion?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setDocumentos(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/logistica/documentos-identificacion/nuevo')
  }

  const handleEdit = (doc: Documento) => {
    router.push(`/logistica/documentos-identificacion/editar/${doc.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este documento?')) return
    try {
      const res = await apiFetch('/api/logistica/documentos-identificacion', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success('Documento desactivado')
        fetchDocumentos()
      }
    } catch (error) {
      toast.error('Error al desactivar documento')
    }
  }

  const columns: Column<Documento>[] = [
    {
      key: 'id',
      header: 'ID',
      width: 'w-24',
      render: (d: Documento) => <span className="text-slate-500 font-mono text-xs">{d.id}</span>
    },
    {
      key: 'descripcion',
      header: 'DESCRIPCIÓN DEL DOCUMENTO',
      render: (d: Documento) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-sm transition-all hover:scale-110">
            <span className="material-symbols-outlined text-sm font-black text-blue-600 uppercase tracking-tighter">
              badge
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{d.descripcion}</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{d.abreviatura}</span>
          </div>
        </div>
      )
    },
    {
      key: 'ruta_API',
      header: 'RUTA API',
      render: (d: Documento) => (
        <span className="text-xs font-mono text-slate-500">
          {d.ruta_API || '—'}
        </span>
      )
    },
    {
      key: 'activo',
      header: 'ESTADO',
      render: (d: Documento) => (
        <Badge variant={d.activo ? 'success' : 'neutral'}>
          {d.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (d: Documento) => (
        <div className="flex items-center gap-1 justify-end">
          {permisos.editar && (
            <button
              onClick={() => handleEdit(d)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(d.id)}
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
      <Topbar title="Gestión de Documentos ID" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Documentos de Identificación
            </h3>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Administre los tipos de documentos de identificación aceptados.
            </p>
          </div>
          {permisos.crear && (
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Documento
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por descripción o abreviatura..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={documentos}
            loading={loading}
            emptyMessage="No se encontraron documentos registrados"
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
