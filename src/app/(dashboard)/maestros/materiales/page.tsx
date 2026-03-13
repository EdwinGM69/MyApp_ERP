'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import CrudModal from '@/components/ui/CrudModal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Material {
  id: number
  codigo: string
  descripcion: string
  categoria?: string
  tipo: string
  unidad_medida?: string
  precio_costo: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  imagen_url?: string
  activo: boolean
  impuesto?: { codigo: string; porcentaje: number } | null
}

const EMPTY = {
  codigo: '', descripcion: '', categoria: '', tipo: 'producto', unidad_medida: '',
  precio_costo: 0, precio_venta: 0, stock_actual: 0, stock_minimo: 0, imagen_url: '', impuesto_id: null as number | null,
}

export default function MaterialesPage() {
  const [data, setData] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Material | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await apiFetch(`/api/materiales?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setSelected(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(m: Material) {
    setSelected(m)
    setForm({
      codigo: m.codigo, descripcion: m.descripcion, categoria: m.categoria ?? '',
      tipo: m.tipo, unidad_medida: m.unidad_medida ?? '',
      precio_costo: Number(m.precio_costo), precio_venta: Number(m.precio_venta),
      stock_actual: Number(m.stock_actual), stock_minimo: Number(m.stock_minimo),
      imagen_url: m.imagen_url ?? '', impuesto_id: null,
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch('/api/materiales', {
        method: selected ? 'PUT' : 'POST',
        body: JSON.stringify(selected ? { id: selected.id, ...form } : form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selected ? 'Material actualizado' : 'Material creado')
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
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
            <p className="font-medium text-slate-900 dark:text-white">{r.descripcion}</p>
            <p className="text-xs text-slate-400">{r.categoria || r.tipo}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'precio_venta', header: 'Precio Venta',
      render: (r: Material) => <span className="font-semibold">{formatCurrency(Number(r.precio_venta))}</span>,
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
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Catálogo de Materiales" />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Catálogo de Materiales
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona productos, servicios y sus precios de costo/venta.
            </p>
          </div>
          <button onClick={openCreate}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-xl">add</span>
            Nuevo Material
          </button>
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

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)}
        title={selected ? 'Editar Material' : 'Nuevo Material'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código *</label>
              <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="producto">Producto</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción *</label>
            <input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad de Medida</label>
              <input value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                placeholder="und, kg, lt..."
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Costo *</label>
              <input type="number" step="0.01" min="0" required value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Venta *</label>
              <input type="number" step="0.01" min="0" required value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Actual</label>
              <input type="number" step="0.001" min="0" value={form.stock_actual}
                onChange={(e) => setForm({ ...form, stock_actual: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Mínimo</label>
              <input type="number" step="0.001" min="0" value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL de Imagen</label>
            <input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              {selected ? 'Guardar Cambios' : 'Crear Material'}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  )
}
