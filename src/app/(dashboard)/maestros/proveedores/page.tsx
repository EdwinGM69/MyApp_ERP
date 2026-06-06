'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import { useRouter } from 'next/navigation'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface Proveedor {
  id: number
  codigo: string
  tipo: string
  tipo_proveedor: string
  nombre: string
  categoria?: string
  industria_id?: number
  industria?: { descripcion: string }
  tipo_nif?: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  banco?: string
  tipo_cuenta?: string
  banco_cuenta?: string
  banco_swift?: string
  banco_titular?: string
  activo: boolean
  created_at?: string
  created_by?: number
  updated_at?: string
  updated_by?: number
}

export default function ProveedoresPage() {
  const router = useRouter()
  const permisos = usePermisos()
  const [data, setData] = useState<Proveedor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await apiFetch(`/api/proveedores?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(p: Proveedor) {
    if (!confirm(`¿Desactivar a ${p.nombre}?`)) return
    const res = await apiFetch('/api/proveedores', { method: 'DELETE', body: JSON.stringify({ id: p.id }) })
    if (res.ok) { toast.success('Proveedor desactivado'); fetchData() }
    else toast.error('Error al desactivar')
  }

  const columns = [
    { key: 'codigo', header: 'ID', width: 'w-24' },
    {
      key: 'nombre', header: 'NOMBRE DEL PROVEEDOR',
      render: (r: Proveedor) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">
              {r.tipo === 'empresa' ? 'business' : 'person'}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{r.nombre}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'CORREO ELECTRÓNICO', render: (r: Proveedor) => r.email || <span className="text-slate-400">—</span> },
    { key: 'telefono', header: 'TELÉFONO', render: (r: Proveedor) => r.telefono || <span className="text-slate-400">—</span> },
    {
      key: 'categoria', header: 'CATEGORÍA',
      render: (r: Proveedor) => (
        <Badge variant="neutral">
          {r.industria?.descripcion || r.categoria || 'Sin Categoría'}
        </Badge>
      ),
    },
    {
      key: 'activo', header: 'ESTADO',
      render: (r: Proveedor) => <Badge variant={r.activo ? 'success' : 'neutral'}>{r.activo ? '● Activo' : '● Inactivo'}</Badge>,
    },
    {
      key: 'actions', header: 'ACCIONES',
      render: (r: Proveedor) => (
        <div className="flex items-center gap-1">
          {permisos.editar && (
            <button onClick={() => router.push(`/maestros/proveedores/editar/${r.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors" title="Editar">
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors" title="Desactivar">
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Catálogo de Proveedores" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Catálogo de Proveedores
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona la base de datos de tus proveedores y sus categorías.
            </p>
          </div>
          {permisos.crear && (
            <button
              onClick={() => router.push('/maestros/proveedores/nuevo')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Agregar Nuevo Proveedor
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre, código o categoría..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron proveedores" />
        </div>

        <div className="mt-4 bg-white rounded-xl border border-slate-100 p-2 shadow-sm">
          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize) || 1}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}
