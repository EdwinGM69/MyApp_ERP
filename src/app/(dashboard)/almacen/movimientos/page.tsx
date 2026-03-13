'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { cn, formatDate } from '@/lib/utils'
import MovimientoModal from './components/MovimientoModal'

export default function MovimientosPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/almacen?page=${page}&pageSize=${pageSize}`)
      const json = await res.json()
      if (json.data) {
        setData(json.data)
        setTotal(json.total)
        setTotalPages(json.totalPages)
      }
    } catch (error) {
      console.error('Error fetching movements:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const columns = [
    {
      key: 'numero_mov',
      header: 'N° MOVIMIENTO',
      render: (row: any) => (
        <span className="font-bold text-primary hover:underline cursor-pointer">
          {row.numero_mov}
        </span>
      ),
    },
    { 
      key: 'fecha', 
      header: 'FECHA',
      render: (row: any) => formatDate(row.fecha)
    },
    {
      key: 'tipo',
      header: 'TIPO',
      render: (row: any) => (
        <Badge
          variant={row.tipo === 'ingreso' ? 'success' : 'info'}
          className="flex items-center gap-1 w-fit uppercase"
        >
          <span className="material-symbols-outlined text-xs">
            {row.tipo === 'ingreso' ? 'south_west' : 'north_east'}
          </span>
          {row.tipo}
        </Badge>
      ),
    },
    { 
      key: 'documento', 
      header: 'DOCUMENTO',
      render: (row: any) => row.documento || '-'
    },
    { 
      key: 'proveedor', 
      header: 'PROVEEDOR',
      render: (row: any) => row.proveedor?.nombre || '-'
    },
    { key: 'referencia', header: 'REFERENCIA' },
    {
      key: 'detalles',
      header: 'CANT. ITEMS',
      render: (row: any) => row.detalles?.length || 0
    },
    {
      key: 'acciones',
      header: '',
      render: () => (
        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-slate-400">more_vert</span>
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Inventarios" />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Breadcrumbs and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-slate-400">INVENTARIOS</span>
              <span className="text-slate-300">/</span>
              <span className="text-primary">MOVIMIENTOS</span>
            </nav>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">
              Gestión de Movimientos de Almacén
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">download</span>
              Exportar
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nuevo Movimiento
            </button>
          </div>
        </div>

        <MovimientoModal 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchData()
            setIsModalOpen(false)
          }}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="TOTAL HOY"
            value={total.toString()}
            icon="inventory"
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
          />
          <StatsCard
            title="PENDIENTES"
            value="0"
            icon="pending_actions"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
          <StatsCard
            title="INGRESOS"
            value={data.filter(d => d.tipo === 'ingreso').length.toString()}
            icon="south_west"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="EGRESOS"
            value={data.filter(d => d.tipo === 'salida').length.toString()}
            icon="north_east"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>

        {/* Data Table */}
        <div className="space-y-4">
          <div className={cn("transition-opacity", isLoading ? "opacity-50" : "opacity-100")}>
            <DataTable
              columns={columns}
              data={data}
              emptyMessage="No se encontraron movimientos"
            />
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              pageSize={pageSize}
              onPageSize={setPageSize}
              total={total}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
