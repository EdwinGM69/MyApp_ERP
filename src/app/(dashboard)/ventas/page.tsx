'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency } from '@/lib/utils'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import Pagination from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Venta {
  id: string
  numero_pedido: string
  cliente: { id: number, nombre: string, codigo: string, tipo: string } | null
  sucursal: { id: number, descripcion: string } | null
  moneda: { id: number, descripcion: string, simbolo: string } | null
  fecha_venta: string
  total: number
  estado: string
}

function VentaCard({ venta, monedaSimbolo, onAnular }: { venta: Venta, monedaSimbolo: string, onAnular: (id: string) => void }) {
  const getStatusVariant = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'procesada': return 'success'
      case 'cotizacion': return 'warning'
      case 'anulada': return 'error'
      default: return 'neutral'
    }
  }

  const statusVariant = getStatusVariant(venta.estado);
  
  const formattedDate = (dateStr: string) => {
    try {
      if (!dateStr) return '---'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '---'
      return format(date, "dd 'de' MMMM, yyyy", { locale: es })
    } catch (e) {
      return '---'
    }
  }

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 lg:p-4 transition-all hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-500/20 active:scale-[0.99] overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
      
      <div className="flex flex-col lg:flex-row lg:items-center gap-8 relative z-10">
        <div className="flex flex-col gap-3 min-w-[260px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl font-variation-icon">receipt_long</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-[0.2em] block mb-0.5">Transacción</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase whitespace-nowrap">
                #{venta.numero_pedido}
              </h3>
            </div>
          </div>

          <div className="flex flex-col pl-10 border-l border-slate-100 dark:border-slate-800 ml-5 py-0">
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Cliente Principal</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
              {venta.cliente?.nombre || 'Consumidor Final'}
            </span>
            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
              ID: {venta.cliente?.codigo || '---'} • {venta.cliente?.tipo === 'premium' ? 'PREMIUM' : 'ESTÁNDAR'}
            </span>
          </div>
        </div>

        {/* Section 2: Financials & Status */}
        <div className="flex flex-col justify-center min-w-[140px]">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-1">Total</span>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
              {formatCurrency(venta.total, { symbol: venta.moneda?.simbolo || monedaSimbolo })}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", 
                statusVariant === 'success' ? "bg-emerald-500 animate-pulse" : 
                statusVariant === 'warning' ? "bg-amber-500" : "bg-red-500"
              )} />
              <span className={cn("text-[9px] font-bold capitalize", 
                statusVariant === 'success' ? "text-emerald-600" : 
                statusVariant === 'warning' ? "text-amber-600" : "text-red-500"
              )}>
                {venta.estado}
              </span>
            </div>
            <span className="text-[8px] text-slate-400 font-medium mt-0.5 tracking-tight">
              {formattedDate(venta.fecha_venta)}
            </span>
          </div>
        </div>

        {/* Section 3: Status History (Mocked) */}
        <div className="hidden lg:flex flex-col gap-1.5 min-w-[180px] px-6 border-x border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block">Historial</span>
          <div className="space-y-2 pt-0.5">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1 relative">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 capitalize leading-none">{venta.estado === 'procesada' ? 'Pago confirmado' : 'Pendiente'}</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">Ref #8821</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-500 mt-1" />
              <div>
                <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 capitalize leading-none text-slate-400">Orden generada</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">{venta.sucursal?.descripcion?.substring(0, 10) || 'Principal'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Performance / Insight (Mocked) */}
        <div className="hidden xxl:flex flex-col gap-1.5 flex-1 px-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block">Insight</span>
            <span className="material-symbols-outlined text-emerald-500 text-base">trending_up</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 ring-1 ring-inset ring-slate-100 dark:ring-slate-800">
            <p className="text-[9px] text-slate-500 font-medium leading-tight italic">
              Venta superior en <span className="font-black text-emerald-600">12%</span> al ticket promedio.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 ml-auto">
          <button className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all flex items-center justify-center group/btn active:scale-90" title="Ver Detalle">
            <span className="material-symbols-outlined text-lg group-hover/btn:scale-110 transition-transform">visibility</span>
          </button>
          <button className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center group/btn active:scale-90" title="Imprimir">
            <span className="material-symbols-outlined text-lg group-hover/btn:scale-110 transition-transform">print</span>
          </button>
          <button 
            onClick={() => onAnular(venta.id)}
            className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex items-center justify-center group/btn active:scale-90" 
            title="Anular"
          >
            <span className="material-symbols-outlined text-lg group-hover/btn:scale-110 transition-transform">block</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const monedaSimbolo = useAuthStore(state => state.user?.monedaSimbolo || '$')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        pageSize: String(pageSize),
        search 
      })
      const res = await apiFetch(`/api/ventas?${params}`)
      if (!res.ok) throw new Error('Error fetching sales')
      const json = await res.json()
      setVentas(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchVentas()
    setMounted(true)
  }, [fetchVentas])

  const getStatusVariant = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'procesada': return 'success'
      case 'cotizacion': return 'warning'
      case 'anulada': return 'error'
      default: return 'neutral'
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchVentas()
  }

  const handleAnular = async (id: string) => {
    if (!confirm('¿Está seguro de que desea anular esta venta?')) return
    try {
      // Assuming a PUT request to /api/ventas translates to an update.
      // Or we can add an annulment logic if an endpoint exists.
      toast.error('Funcionalidad de anulación pendiente de implementación en backend.')
    } catch (error) {
      toast.error('Error al anular venta')
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Gestión de Ventas / Facturación" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-2xl gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar por Nº pedido, cliente o comprobante..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <button 
                type="submit" 
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center"
              >
                Buscar
              </button>
            </form>
            
            <div className="flex items-center gap-3 shrink-0">
              <button className="h-11 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                Exportar
              </button>
              
              <Link href="/ventas/nueva" className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nueva Venta
              </Link>
            </div>
          </div>

          {/* Cards Container */}
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center text-slate-400">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="font-bold uppercase tracking-widest text-xs">Cargando ventas...</p>
                </div>
              </div>
            ) : ventas.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-4 text-slate-300">search_off</span>
                <p className="font-bold uppercase tracking-widest text-xs">No se encontraron ventas.</p>
              </div>
            ) : (
              ventas.map((venta) => (
                <VentaCard 
                  key={venta.id} 
                  venta={venta} 
                  monedaSimbolo={monedaSimbolo} 
                  onAnular={handleAnular} 
                />
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 mt-8 border-t border-slate-100 dark:border-slate-800">
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
      </main>
    </div>
  )
}
