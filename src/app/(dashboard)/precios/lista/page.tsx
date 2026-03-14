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

interface Impuesto {
  id: number
  codigo: string
  porcentaje: number
  descripcion: string
}

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
  impuesto_id?: number | null
  impuesto?: { codigo: string; porcentaje: number } | null
}

export default function PreciosPage() {
  const [data, setData] = useState<Material[]>([])
  const [impuestos, setImpuestos] = useState<Impuesto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [precioVenta, setPrecioVenta] = useState(0)
  const [impuestoId, setImpuestoId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      
      const [matRes, impRes] = await Promise.all([
        apiFetch(`/api/materiales?${params}`),
        apiFetch('/api/impuestos')
      ])

      const matJson = await matRes.json()
      const impJson = await impRes.json()

      setData(matJson.data ?? [])
      setTotal(matJson.total ?? 0)
      setImpuestos(impJson.data ?? [])
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { fetchData() }, [fetchData])

  function openEdit(m: Material) {
    setSelected(m)
    setPrecioVenta(Number(m.precio_venta))
    setImpuestoId(m.impuesto_id ?? null)
    setModalOpen(true)
  }

  // To simulate adding a new price, we would redirect to materials or add it from here. 
  // However, since "prices" are inherently attached to materials in this schema,
  // the "Add New Price" could just be an edit of an existing material, 
  // or a creation of a new material. The plan focuses on the list and edit.
  // We'll just alert that material creation happens in the catalog for now or route them to materials.

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return

    setSaving(true)
    try {
      const form = {
        id: selected.id,
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        categoria: selected.categoria,
        tipo: selected.tipo,
        unidad_medida: selected.unidad_medida,
        precio_costo: selected.precio_costo,
        stock_actual: selected.stock_actual,
        stock_minimo: selected.stock_minimo,
        imagen_url: selected.imagen_url,
        activo: selected.activo,
        precio_venta: precioVenta,
        impuesto_id: impuestoId,
      }

      const res = await apiFetch('/api/materiales', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      
      toast.success('Precio actualizado correctamente')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el precio')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { 
      key: 'codigo', 
      header: 'ID MATERIAL',
      render: (r: Material) => <span className="text-slate-500 font-medium">{r.codigo}</span>
    },
    {
      key: 'descripcion', 
      header: 'NOMBRE DEL MATERIAL',
      render: (r: Material) => <span className="font-semibold text-slate-900 dark:text-white">{r.descripcion}</span>
    },
    {
      key: 'categoria', 
      header: 'CATEGORÍA',
      render: (r: Material) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium">
          {r.categoria || r.tipo}
        </span>
      )
    },
    {
      key: 'precio_base', 
      header: 'PRECIO BASE',
      render: (r: Material) => <span className="font-semibold">{formatCurrency(Number(r.precio_venta))}</span>,
    },
    {
      key: 'impuestos', 
      header: 'IMPUESTOS (%)',
      render: (r: Material) => <span className="font-medium text-slate-600 dark:text-slate-300">{r.impuesto ? `${Number(r.impuesto.porcentaje)}%` : '0%'}</span>,
    },
    {
      key: 'precio_final', 
      header: 'PRECIO FINAL',
      render: (r: Material) => {
        const base = Number(r.precio_venta)
        const impuestoPorcentaje = r.impuesto ? Number(r.impuesto.porcentaje) : 0
        const final = base + (base * (impuestoPorcentaje / 100))
        return <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(final)}</span>
      },
    },
    {
      key: 'activo', 
      header: 'ESTADO',
      render: (r: Material) => (
        <div className="flex items-center gap-1.5 font-medium text-sm">
          <div className={`w-2 h-2 rounded-full ${r.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className={r.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
            {r.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions', 
      header: 'ACCIONES',
      render: (r: Material) => (
        <button 
          onClick={() => openEdit(r)} 
          className="text-blue-600 dark:text-blue-500 font-bold text-xs uppercase hover:underline"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Precios" />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Precios
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administre los precios de venta por material y categoría.
            </p>
          </div>
          <button 
            onClick={() => toast.success('Por favor, cree un nuevo material en el Catálogo de Materiales.')}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Agregar Nuevo Precio
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron precios" />
        </div>
        
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full">
            <Pagination 
              page={page} 
              totalPages={Math.ceil(total / pageSize)} 
              onPage={setPage}
              pageSize={pageSize} 
              onPageSize={(s) => { setPageSize(s); setPage(1) }} 
              total={total} 
            />
          </div>
        </div>
      </div>

      <CrudModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        title="Editar Precio" 
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Material
            </label>
            <input 
              disabled 
              value={selected?.descripcion || ''} 
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Precio Base *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  required 
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Impuesto
              </label>
              <select 
                value={impuestoId || ''} 
                onChange={(e) => setImpuestoId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Exento (0%)</option>
                {impuestos.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.codigo} ({imp.porcentaje}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              Guardar Precio
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  )
}
