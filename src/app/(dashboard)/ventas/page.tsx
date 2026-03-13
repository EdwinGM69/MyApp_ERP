'use client'

import { useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface Venta {
  id: string
  numero_pedido: string
  cliente: string
  fecha: string
  total: number
  estado: 'Pagada' | 'Pendiente' | 'Anulada'
}

const VENTAS_DEMO: Venta[] = [
  { id: '1', numero_pedido: 'F-001', cliente: 'Juan Pérez', fecha: '25 Oct, 2023', total: 1200, estado: 'Pagada' },
  { id: '2', numero_pedido: 'F-002', cliente: 'Empresa ACME', fecha: '26 Oct, 2023', total: 3450, estado: 'Pendiente' },
  { id: '3', numero_pedido: 'F-003', cliente: 'Maria Garcia', fecha: '26 Oct, 2023', total: 850, estado: 'Pagada' },
  { id: '4', numero_pedido: 'F-004', cliente: 'Logística Sur', fecha: '27 Oct, 2023', total: 2100, estado: 'Anulada' },
  { id: '5', numero_pedido: 'F-005', cliente: 'Inversiones Delta', fecha: '27 Oct, 2023', total: 5620, estado: 'Pendiente' },
]

export default function VentasPage() {
  const [ventas] = useState<Venta[]>(VENTAS_DEMO)

  const getStatusVariant = (estado: string) => {
    switch (estado) {
      case 'Pagada': return 'success'
      case 'Pendiente': return 'warning'
      case 'Anulada': return 'error'
      default: return 'neutral'
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

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nº Factura</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {ventas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-primary hover:underline cursor-pointer">{venta.numero_pedido}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{venta.cliente}</span>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-500 text-sm">
                        {venta.fecha}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(venta.total)}</span>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant={getStatusVariant(venta.estado)}>{venta.estado}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-xl">print</span>
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
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
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-bold text-slate-900 dark:text-white">1</span> a <span className="font-bold text-slate-900 dark:text-white">5</span> de <span className="font-bold text-slate-900 dark:text-white">42</span> resultados
              </p>
              <div className="flex items-center gap-1">
                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
                </button>
                <button className="size-8 flex items-center justify-center bg-primary text-white rounded-lg text-sm font-bold">1</button>
                <button className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400">2</button>
                <button className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400">3</button>
                <span className="px-2 text-slate-400 text-sm">...</span>
                <button className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400">9</button>
                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
