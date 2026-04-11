'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Material {
  id: number
  codigo: string
  descripcion: string
  precio_venta: number
  moneda: string
}

interface PromocionDetalle {
  id?: number
  material_id: number
  tipo_promocion?: string | null
  tipo_descuento?: string | null
  valor?: number | null
  material?: Material
}

interface Promocion {
  id: number
  codigo_promocion: string
  nombre: string
  descripcion?: string | null
  tipo: string
  fecha_inicio: string
  fecha_fin?: string | null
  activo: boolean
  detalles?: PromocionDetalle[]
  created_at?: string
  updated_at?: string
  creador?: { nombre: string }
  actualizador?: { nombre: string }
}

export default function PromocionesPage() {
  const router = useRouter()
  const [data, setData] = useState<Promocion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const res = await apiFetch(`/api/precios/promociones?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar promociones')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { 
    fetchData() 
  }, [fetchData])

  function formatDateRange(inicio: string, fin?: string | null) {
    const format = (dateStr: string) => {
      const d = new Date(dateStr)
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
    }
    const start = format(inicio)
    const end = fin ? format(fin) : 'Indefinido'
    return `${start} - ${end}`
  }

  const columns = [
    { 
      key: 'codigo_promocion', 
      header: 'ID PROMO',
      render: (r: Promocion) => <span className="text-slate-500 font-mono text-sm tracking-tight">{r.codigo_promocion}</span>
    },
    {
      key: 'nombre', 
      header: 'NOMBRE',
      render: (r: Promocion) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-200">{r.nombre}</span>
          {r.descripcion && (
            <span className="text-xs text-slate-500">{r.descripcion}</span>
          )}
        </div>
      )
    },
    {
      key: 'tipo', 
      header: 'TIPO',
      render: (r: Promocion) => {
        let bgClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
        
        switch (r.tipo) {
          case '2x1': 
            bgClass = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
            break
          case 'Combo':
            bgClass = 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400'
            break
          case 'Envío Gratis':
            bgClass = 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
            break
          case 'Descuento %':
            bgClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
            break
          case '3x2':
            bgClass = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400'
            break
        }

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${bgClass}`}>
            {r.tipo}
          </span>
        )
      }
    },
    {
      key: 'vigencia', 
      header: 'VIGENCIA',
      render: (r: Promocion) => <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>,
    },
    {
      key: 'estado', 
      header: 'ESTADO',
      render: (r: Promocion) => {
        const now = new Date()
        const inicio = new Date(r.fecha_inicio)
        const fin = r.fecha_fin ? new Date(r.fecha_fin) : null

        let state = 'Activa'
        let colorClass = 'text-emerald-700 dark:text-emerald-400'
        let dotClass = 'bg-emerald-500'

        if (!r.activo || (fin && now > fin)) {
          state = 'Inactiva'
          colorClass = 'text-slate-500 dark:text-slate-400'
          dotClass = 'bg-slate-400'
        } else if (now < inicio) {
          state = 'Programada'
          colorClass = 'text-amber-600 dark:text-amber-400'
          dotClass = 'bg-amber-500'
        }

        return (
          <div className={`inline-flex items-center gap-2 font-bold text-sm ${colorClass}`}>
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            {state}
          </div>
        )
      },
    },
    {
      key: 'acciones', 
      header: 'ACCIONES',
      render: (r: Promocion) => (
        <div className="flex justify-end pr-4">
          <button 
            onClick={() => router.push(`/precios/promociones/editar/${r.id}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60">
      <Topbar title="Precios / Promociones" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Promociones
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Configura y monitorea las ofertas activas en tu sistema POS.
            </p>
          </div>
          <button 
            onClick={() => router.push('/precios/promociones/nuevo')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0 text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Agregar Nueva Promoción
          </button>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron promociones." />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-t border-slate-100 dark:border-slate-800">
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
      </div>
    </div>
  )
}
