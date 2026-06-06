'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useSucursal } from '@/contexts/SucursalContext'
import { usePermisos } from '@/contexts/PermisosContext'

interface Material {
  id: number
  codigo: string
  descripcion: string
  unidad_medida?: string
  precio_costo: number
  costo_promedio: number
  stock_actual: number
  stock_minimo: number
  imagen_url?: string
  activo: boolean
  impuesto?: { codigo: string; porcentaje: number } | null
  marca?: { id: number, descripcion: string } | null
  categoria_rel?: { id: number, descripcion: string } | null
}

const EMPTY = {
  codigo: '', descripcion: '', unidad_medida: '',
  precio_costo: 0, precio_venta: 0, stock_actual: 0, stock_minimo: 0, imagen_url: '', impuesto_id: null as number | null,
}

export default function MaterialesPage() {
  const [data, setData] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const monedaSimbolo = useAuthStore(state => state.user?.monedaSimbolo || '$')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { currentSucursal } = useSucursal()
  const permisos = usePermisos()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    if (currentSucursal?.id) {
      params.set('sucursalId', String(currentSucursal.id))
    }
    const res = await apiFetch(`/api/materiales?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, pageSize, search, currentSucursal])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    router.push('/maestros/materiales/nuevo')
  }

  function openEdit(m: Material) {
    router.push(`/maestros/materiales/editar/${m.id}`)
  }

  async function handleDelete(m: Material) {
    if (!confirm(`¿Desactivar "${m.descripcion}"?`)) return
    const res = await apiFetch('/api/materiales', { method: 'DELETE', body: JSON.stringify({ id: m.id }) })
    if (res.ok) { toast.success('Material desactivado'); fetchData() }
  }

  function stockStatus(m: Material): { label: string; variant: 'success' | 'warning' | 'error' } {
    const s = Number(m.stock_actual)
    const min = Number(m.stock_minimo)
    if (s <= 0) return { label: 'Sin Stock', variant: 'error' }
    if (s <= min) return { label: 'Stock Bajo', variant: 'warning' }
    return { label: 'Normal', variant: 'success' }
  }

  const columns = [
    { key: 'codigo', header: 'Código', width: 'w-24' },
    {
      key: 'descripcion', header: 'Producto',
      render: (r: Material) => (
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {r.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.imagen_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-slate-400">inventory_2</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900 dark:text-white">{r.descripcion}</p>
              {r.marca && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 uppercase tracking-tight">
                  {r.marca.descripcion}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{r.categoria_rel?.descripcion || 'Sin categoría'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'costo_promedio', header: 'Costo Promedio',
      render: (r: Material) => <span className="font-semibold">{formatCurrency(Number(r.costo_promedio), { symbol: monedaSimbolo })}</span>,
    },
    {
      key: 'stock_actual', header: 'Stock',
      render: (r: Material) => {
        const { label, variant } = stockStatus(r)
        return (
          <div>
            <span className="font-semibold">{Number(r.stock_actual)}</span>
            <span className="text-xs text-slate-400 ml-1">{r.unidad_medida || 'und'}</span>
            <br />
            <Badge variant={variant}>{label}</Badge>
          </div>
        )
      },
    },
    {
      key: 'activo', header: 'Estado',
      render: (r: Material) => <Badge variant={r.activo ? 'success' : 'error'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'actions', header: '',
      render: (r: Material) => (
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
      <Topbar title="Catálogo de Materiales" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Catálogo de Materiales
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona productos, servicios y sus precios de costo/venta.
            </p>
          </div>
          {permisos.crear && (
            <button onClick={openCreate}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Material
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

        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron materiales" />
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPage={setPage}
          pageSize={pageSize} onPageSize={(s) => { setPageSize(s); setPage(1) }} total={total} />
      </div>
    </div>
  )
}
