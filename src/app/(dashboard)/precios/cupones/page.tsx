'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface Material {
  id: number
  codigo: string
  descripcion: string
  precio_venta: number
  moneda: string
}

interface CuponDetalle {
  id?: number
  material_id: number
  material?: Material
}

interface Cupon {
  id: number
  codigo_cupon: string
  codigo: string
  tipo: string
  valor: number
  moneda: string
  limite_uso?: number | null
  usos_actuales: number
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
  detalles?: CuponDetalle[]
  created_at?: string
  updated_at?: string
  creador?: { nombre: string }
  actualizador?: { nombre: string }
}

export default function CuponesPage() {
  const router = useRouter()
  const [data, setData] = useState<Cupon[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const res = await apiFetch(`/api/precios/cupones?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar cupones')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { 
    fetchData() 
  }, [fetchData])

  function formatDateRange(inicio: string, fin?: string) {
    const format = (dateStr: string) => {
      const d = new Date(dateStr)
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
    }
    const start = format(inicio)
    const end = fin ? format(fin) : 'Indefinido'
    return `${start} - ${end}`
  }

  function formatValor(tipo: string, valor: number, moneda: string) {
    if (tipo === 'PORCENTAJE') return `${Number(valor)}%`
    return `${moneda === 'PEN' ? 'S/' : '$'}${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
  }

  const columns = [
    { 
      key: 'codigo_cupon', 
      header: 'ID CUPÓN',
      render: (r: Cupon) => <span className="font-bold text-slate-700 dark:text-slate-300">{r.codigo_cupon}</span>
    },
    {
      key: 'codigo', 
      header: 'CÓDIGO',
      render: (r: Cupon) => (
        <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
          {r.codigo}
        </span>
      )
    },
    {
      key: 'tipo', 
      header: 'TIPO',
      render: (r: Cupon) => <span className="text-slate-500 font-medium tracking-wide uppercase text-xs">{r.tipo}</span>
    },
    {
      key: 'valor', 
      header: 'VALOR',
      render: (r: Cupon) => <span className="font-black text-slate-900 dark:text-white">{formatValor(r.tipo, r.valor, r.moneda)}</span>,
    },
    {
      key: 'limite', 
      header: 'LÍMITE DE USO',
      render: (r: Cupon) => (
        <span className="text-slate-600 dark:text-slate-400">
          {r.limite_uso === null ? 'Ilimitado' : r.limite_uso}
        </span>
      ),
    },
    {
      key: 'vigencia', 
      header: 'VIGENCIA',
      render: (r: Cupon) => <span className="text-slate-500 font-medium tracking-tight text-sm">{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>,
    },
    {
      key: 'estado', 
      header: 'ESTADO',
      render: (r: Cupon) => {
        let state = 'ACTIVO'
        let colorClass = 'text-emerald-600'
        let dotClass = 'bg-emerald-500'

        if (!r.activo) {
          state = 'INACTIVO'
          colorClass = 'text-slate-400'
          dotClass = 'bg-slate-300'
        } else if (r.fecha_fin && new Date(r.fecha_fin) < new Date()) {
          state = 'EXPIRADO'
          colorClass = 'text-red-600'
          dotClass = 'bg-red-500'
        }

        return (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold text-xs ${colorClass}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {state}
          </div>
        )
      },
    },
    {
      key: 'actions', 
      header: 'ACCIONES',
      render: (r: Cupon) => (
        <button 
          onClick={() => router.push(`/precios/cupones/editar/${r.id}`)}
          className="text-blue-600 dark:text-blue-500 font-bold text-sm hover:underline"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Topbar title="Precios / Cupones" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Cupones
            </h3>
            <p className="text-slate-500 text-base mt-2">
              Crea y administra los cupones de descuento para tus clientes.
            </p>
          </div>
          <button 
            onClick={() => router.push('/precios/cupones/nuevo')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Agregar Nuevo Cupón
          </button>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron cupones" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-t border-slate-100 dark:border-slate-800">
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
