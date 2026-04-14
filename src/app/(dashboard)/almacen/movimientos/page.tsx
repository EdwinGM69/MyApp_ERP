'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { cn, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import SucursalGuard from '@/components/SucursalGuard'
import { useSucursal } from '@/contexts/SucursalContext'

export default function MovimientosPage() {
  const router = useRouter()
  const { currentSucursal } = useSucursal()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (currentSucursal?.id) params.set('sucursalId', String(currentSucursal.id))
      const res = await fetch(`/api/almacen?${params}`)
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
  }, [page, pageSize, currentSucursal])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const columns = [
    {
      key: 'numero_pedido',
      header: 'N° PEDIDO',
      render: (row: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer tracking-tight">
            {row.numero_pedido}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{row.tipo_operacion?.codigo || 'MOV'}</span>
        </div>
      ),
    },
    { 
      key: 'fecha', 
      header: 'FECHA',
      render: (row: any) => (
        <div className="flex flex-col">
          <span className="text-slate-700 dark:text-slate-200 font-bold text-xs uppercase">{formatDate(row.fecha)}</span>
          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-0.5">Registro</span>
        </div>
      )
    },
    {
      key: 'tipo_operacion',
      header: 'OPERACIÓN',
      render: (row: any) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant={row.tipo_operacion?.afecta_stock ? 'success' : 'info'}
            className="flex items-center gap-1.5 w-fit uppercase font-black text-[9px] tracking-widest px-2 py-0.5 rounded-lg"
          >
            <span className="material-symbols-outlined text-[12px]">
              {row.tipo_operacion?.signo_origen === '+' ? 'add_circle' : 'remove_circle'}
            </span>
            {row.tipo_operacion?.descripcion}
          </Badge>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{row.sucursal?.descripcion || `Sucursal ${row.sucursal_id}`}</span>
        </div>
      ),
    },
    { 
      key: 'entidad', 
      header: 'ENTIDAD',
      render: (row: any) => {
        const nombre = row.proveedor?.nombre || row.cliente?.nombre || '-';
        const tipo = row.proveedor ? 'Proveedor' : row.cliente ? 'Cliente' : '';
        return (
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-tight truncate max-w-[150px]">{nombre}</span>
            {tipo && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{tipo}</span>}
          </div>
        )
      }
    },
    { 
      key: 'documento', 
      header: 'REFERENCIA',
      render: (row: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-tight">{row.documento || '-'}</span>
          <span className="text-[9px] font-medium text-slate-400 italic truncate max-w-[120px]">{row.referencia || '-'}</span>
        </div>
      )
    },
    {
      key: 'detalles',
      header: 'MATERIALES',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {row._count?.detalles ?? 0}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ítems</span>
            <span className="text-[9px] font-medium text-slate-400 leading-none mt-1">Registrados</span>
          </div>
        </div>
      )
    },
    {
      key: 'acciones',
      header: '',
      render: () => (
        <button className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
          <span className="material-symbols-outlined text-[20px]">more_vert</span>
        </button>
      ),
    },
  ]

  return (
    <SucursalGuard moduleName="Inventario">
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60">
        <Topbar title="Inventarios" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full min-h-0">
        {/* Header section with Premium design */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <span className="text-slate-400/80">Inventarios</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-600">Movimientos</span>
            </nav>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Movimientos
            </h1>
            <p className="text-slate-500 text-sm mt-1">Administración de entradas, salidas y ajustes de stock en el almacén central.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="h-11 px-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
              Exportar
            </button>
            <button 
              onClick={() => router.push('/almacen/movimientos/nuevo')}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo Movimiento
            </button>
          </div>
        </div>

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
            value={data.filter(d => d.tipo_operacion?.signo_origen === '+').length}
            icon="south_west"
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="EGRESOS"
            value={data.filter(d => d.tipo_operacion?.signo_origen === '-').length}
            icon="north_east"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>

        {/* Data Table */}
        <div className="space-y-4 mt-6">
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
    </SucursalGuard>
  )
}
