'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/hooks/useAuth'
import Pagination from '@/components/ui/Pagination'
import toast from 'react-hot-toast'

interface Venta {
  id: string
  numero_pedido: string
  cliente: { nombre: string } | null
  fecha_venta: string
  total: number
  estado: string
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

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
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Ventas / Facturación</h1>
              <p className="text-slate-500 mt-1">Administre sus comprobantes, estados de cobro y registros de facturación.</p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar por Nº pedido, cliente o comprobante..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-96 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Buscar</button>
          </form>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nº Factura / Pedido</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando ventas...</td>
                    </tr>
                  ) : ventas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No se encontraron ventas.</td>
                    </tr>
                  ) : ventas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-primary hover:underline cursor-pointer">{venta.numero_pedido}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{venta.cliente?.nombre || 'Consumidor Final'}</span>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-500 text-sm">
                        {new Date(venta.fecha_venta).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(venta.total)}</span>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant={getStatusVariant(venta.estado)}>{venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Ver Detalle">
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Imprimir Recibo">
                            <span className="material-symbols-outlined text-xl">print</span>
                          </button>
                          <button 
                            onClick={() => handleAnular(venta.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" 
                            title="Anular"
                          >
                            <span className="material-symbols-outlined text-xl">block</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
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
      </main>
    </div>
  )
}
