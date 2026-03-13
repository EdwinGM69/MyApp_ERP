'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import StatsCard from '@/components/ui/StatsCard'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface DashboardData {
  inventarioValue: number
  ventasMes: { total: number; count: number }
  ventasDia: { total: number; count: number }
  topProductos: Array<{ material: { descripcion: string; imagen_url?: string }; total: number; cantidad: number }>
  ventasSemestre: Array<{ mes: string; total: number }>
  ventasRecientes: Array<{ id: number; numero_pedido: string; cliente: string; total: number; estado: string; fecha_venta: string }>
}

const MESES_DEMO = [
  { mes: 'Ene', total: 18000000 },
  { mes: 'Feb', total: 14000000 },
  { mes: 'Mar', total: 25000000 },
  { mes: 'Abr', total: 21000000 },
  { mes: 'May', total: 28000000 },
  { mes: 'Jun', total: 12000000 },
]

function estadoBadge(estado: string) {
  const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    procesada: 'success',
    cotizacion: 'warning',
    anulada: 'error',
  }
  const labels: Record<string, string> = {
    procesada: 'Procesada',
    cotizacion: 'Cotización',
    anulada: 'Anulada',
  }
  return <Badge variant={map[estado] ?? 'neutral'}>{labels[estado] ?? estado}</Badge>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const semestre = data?.ventasSemestre?.length ? data.ventasSemestre : MESES_DEMO
  const maxVal = Math.max(...semestre.map((d) => Number(d.total)))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Dashboard Principal" />

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Valor Total Inventario"
            value={loading ? '...' : formatCurrency(data?.inventarioValue ?? 0)}
            icon="inventory"
            iconColor="text-primary"
            iconBg="bg-primary/10"
            trend={{ value: '12%', positive: true }}
          />
          <StatsCard
            title="Ventas del Mes"
            value={loading ? '...' : formatCurrency(data?.ventasMes.total ?? 0)}
            icon="payments"
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            trend={{ value: '5.4%', positive: true }}
          />
          <StatsCard
            title="Ventas del Día"
            value={loading ? '...' : formatCurrency(data?.ventasDia.total ?? 0)}
            icon="today"
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
            subtitle={`${data?.ventasDia.count ?? 0} transacciones hoy`}
          />
          <StatsCard
            title="Nuevos Clientes"
            value={loading ? '...' : String(data?.ventasMes.count ?? 0)}
            icon="group"
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            trend={{ value: '18%', positive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Ventas Mensuales</h4>
                <p className="text-slate-500 text-xs mt-1">Resumen del rendimiento del semestre</p>
              </div>
              <select className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-bold py-1 px-3 focus:ring-0 text-slate-700 dark:text-slate-200">
                <option>Últimos 6 meses</option>
                <option>Este año</option>
              </select>
            </div>

            <div className="flex-1 flex items-end gap-4 h-48 px-2">
              {semestre.map((item, i) => {
                const height = maxVal > 0 ? (Number(item.total) / maxVal) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary/20 hover:bg-primary rounded-t-lg transition-all cursor-pointer relative group"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                        {formatCurrency(Number(item.total))}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{item.mes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 5 products */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Top Productos</h4>
            <p className="text-slate-500 text-xs mb-5">Los más vendidos del período</p>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : data?.topProductos.length ? (
                data.topProductos.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.material?.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.material.imagen_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-slate-400 text-xl">inventory_2</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.material?.descripcion ?? 'Producto'}
                      </p>
                      <p className="text-xs text-slate-500">{formatCurrency(Number(item.total))}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de ventas</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent sales table */}
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white">Ventas Recientes del Día</h4>
            <a href="/ventas/listado" className="text-sm text-primary hover:underline font-medium">
              Ver todas
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pedido</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.ventasRecientes.length ? (
                  data.ventasRecientes.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-primary">{v.numero_pedido}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{v.cliente}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(v.fecha_venta)}</td>
                      <td className="px-6 py-4">{estadoBadge(v.estado)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900 dark:text-white">
                        {formatCurrency(Number(v.total))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                      No hay ventas hoy
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
