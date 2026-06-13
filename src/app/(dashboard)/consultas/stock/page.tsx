'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

import Topbar from '@/components/layout/Topbar'
import Pagination from '@/components/ui/Pagination'
import MultiSelect from '@/components/ui/MultiSelect'
import SucursalGuard from '@/components/SucursalGuard'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Material {
  codigo: string
  descripcion: string
}

interface Almacen {
  descripcion: string
}

interface EstadoStock {
  id: number
  codigo: string
  descripcion: string
}

interface Ubicacion {
  codigo: string
  descripcion: string
}

interface UnidadMedida {
  descripcion: string
  abreviatura: string
}

interface StockDetalle {
  numero_lote: string | null
  ubicacion: Ubicacion | null
  estado_stock: EstadoStock
  cantidad: number
  unidad_medida: UnidadMedida | null
}

interface StockRow {
  material_id: number
  material: Material
  almacen_id: number
  almacen: Almacen
  stock_por_estado: Record<string, { id: number; codigo: string; descripcion: string; cantidad: number }>
  ultimo_movimiento: string | null
  detalles: StockDetalle[]
}

interface HistorialRow {
  id: number
  updated_at: string
  material: Material
  sucursal: { descripcion: string } | null
  almacen: Almacen | null
  ubicacion: Ubicacion | null
  estado_stock: { codigo: string; descripcion: string } | null
  cantidad: number
  unidad_medida: UnidadMedida | null
  numero_lote: string | null
}

function fmtDt(dateStr?: string | null) {
  try {
    if (!dateStr) return '---'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '---'
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return '---'
  }
}

function fmtDate(dateStr?: string | null) {
  try {
    if (!dateStr) return '---'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '---'
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch {
    return '---'
  }
}

function DetailModal({
  open,
  onClose,
  row,
}: {
  open: boolean
  onClose: () => void
  row: StockRow | null
}) {
  if (!open || !row) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-500 text-xl">inventory_2</span>
            <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Detalle de Stock
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{row.material.codigo}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{row.material.descripcion}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
            <span className="text-xs text-slate-500">{row.almacen.descripcion}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lote</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</th>
                  <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipo Stock</th>
                  <th className="text-right px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unidades</th>
                  <th className="text-center px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">U.M.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {row.detalles.map((det, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {det.numero_lote || <span className="text-slate-300 dark:text-slate-600">---</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                          {det.ubicacion?.codigo || '---'}
                        </span>
                        {det.ubicacion?.descripcion && (
                          <span className="text-[10px] text-slate-400">{det.ubicacion.descripcion}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {det.estado_stock.descripcion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {det.cantidad.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {det.unidad_medida?.abreviatura || '---'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function getFirstDayOfMonth() {
  const d = new Date()
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd')
}

export default function ConsultaStockPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'historial'>('stock')

  const [materialIds, setMaterialIds] = useState<number[]>([])
  const [fechaDesde, setFechaDesde] = useState(getFirstDayOfMonth)
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [busquedaActiva, setBusquedaActiva] = useState(false)

  const [stockData, setStockData] = useState<StockRow[]>([])
  const [totalStock, setTotalStock] = useState(0)
  const [pageStock, setPageStock] = useState(1)

  const [historialData, setHistorialData] = useState<HistorialRow[]>([])
  const [totalHistorial, setTotalHistorial] = useState(0)
  const [pageHistorial, setPageHistorial] = useState(1)

  const [estadosStock, setEstadosStock] = useState<EstadoStock[]>([])

  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<StockRow | null>(null)

  const fetchData = useCallback(
    async (exportMode = false) => {
      if (!busquedaActiva && !exportMode) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('tipo', activeTab)
        if (materialIds.length > 0) params.set('materialIds', materialIds.join(','))
        if (fechaDesde) params.set('fecha_desde', fechaDesde)
        if (fechaHasta) params.set('fecha_hasta', fechaHasta)

        if (!exportMode) {
          params.set('page', String(activeTab === 'stock' ? pageStock : pageHistorial))
          params.set('pageSize', String(pageSize))
        } else {
          params.set('pageSize', '10000')
          params.set('page', '1')
        }

        const res = await apiFetch(`/api/consultas/stock?${params}`)
        const json = await res.json()
        if (json.data) {
          if (exportMode) return json
          if (activeTab === 'stock') {
            setStockData(json.data)
            setTotalStock(json.total)
            setEstadosStock(json.estadosStock || [])
          } else {
            setHistorialData(json.data)
            setTotalHistorial(json.total)
          }
        }
      } catch {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
      return null
    },
    [activeTab, materialIds, fechaDesde, fechaHasta, pageStock, pageHistorial, pageSize, busquedaActiva]
  )

  useEffect(() => {
    if (busquedaActiva) fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setPageStock(1)
    setPageHistorial(1)
    setBusquedaActiva(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const json = await fetchData(true)
      if (!json) return
      const allData = json.data || []

      let headers: string[]
      let rows: any[][]

      if (activeTab === 'stock') {
        headers = [
          'Código Material',
          'Descripción Material',
          'Almacén',
          ...(json.estadosStock || []).map((e: EstadoStock) => e.descripcion),
          'Último Movimiento',
        ]
        rows = allData.map((row: StockRow) => [
          row.material.codigo,
          row.material.descripcion,
          row.almacen.descripcion,
          ...(json.estadosStock || []).map((e: EstadoStock) =>
            row.stock_por_estado[e.id] ? row.stock_por_estado[e.id].cantidad.toFixed(2) : '0.00'
          ),
          fmtDt(row.ultimo_movimiento),
        ])
      } else {
        headers = [
          'Fecha / Hora',
          'Sucursal',
          'Almacén',
          'Lote',
          'Ubicación',
          'Estado de Stock',
          'Cantidad',
          'Unidad de Medida',
        ]
        rows = allData.map((row: HistorialRow) => [
          fmtDt(row.updated_at),
          row.sucursal?.descripcion || '---',
          row.almacen?.descripcion || '---',
          row.numero_lote || '---',
          row.ubicacion ? `${row.ubicacion.codigo} - ${row.ubicacion.descripcion}` : '---',
          row.estado_stock?.descripcion || '---',
          Number(row.cantidad).toFixed(2),
          row.unidad_medida?.abreviatura || '---',
        ])
      }

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, activeTab === 'stock' ? 'Stock Actual' : 'Historial Stock')

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbOut], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      const prefix = activeTab === 'stock' ? 'stock_actual' : 'historial_stock'
      a.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(`Error al exportar: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const openDetail = (row: StockRow) => {
    setDetailRow(row)
    setDetailModalOpen(true)
  }

  const currentTotal = activeTab === 'stock' ? totalStock : totalHistorial

  const tabs = [
    { id: 'stock' as const, label: 'Stock Actual', icon: 'inventory' },
    { id: 'historial' as const, label: 'Historial de Stock', icon: 'history' },
  ]

  return (
    <SucursalGuard moduleName="Inventario">
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <Topbar title="Consulta de Stock" />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-background-dark print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none">

            {/* Filters */}
            <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-slate-400 text-lg">filter_alt</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filtros de Búsqueda</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Material</label>
                  <MultiSelect
                    endpoint="/api/materiales"
                    values={materialIds}
                    onChange={setMaterialIds}
                    placeholder="Todos los materiales"
                    searchPlaceholder="Buscar material..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fecha Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    max={fechaHasta || undefined}
                    className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fecha Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    min={fechaDesde || undefined}
                    className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.12em] transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[17px]">search</span>
                    Buscar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                      activeTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    )}
                  >
                    <span className="material-symbols-outlined text-base">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-2">
                  {busquedaActiva
                    ? `${currentTotal} registro${currentTotal !== 1 ? 's' : ''} encontrado${currentTotal !== 1 ? 's' : ''}`
                    : ''}
                </span>
                <button
                  onClick={handlePrint}
                  disabled={!busquedaActiva}
                  className="h-9 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimir
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || !busquedaActiva}
                  className="h-9 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {exporting ? 'progress_activity' : 'file_download'}
                  </span>
                  {exporting ? 'Exportando...' : 'Exportar Excel'}
                </button>
              </div>
            </div>

            {/* Tables */}
            {!busquedaActiva ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-12 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <span className="material-symbols-outlined text-4xl">manage_search</span>
                  <p className="text-sm">Utilice los filtros y presione Buscar para consultar el stock.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      {activeTab === 'stock'
                        ? ['Material', 'Almacén', ...(estadosStock.length > 0 ? estadosStock.map((e) => e.descripcion) : ['Stock']), 'Últ. Movimiento', 'Acciones'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))
                        : ['Fecha / Hora', 'Sucursal', 'Almacén', 'Lote', 'Ubicación', 'Estado Stock', 'Cantidad', 'U.M.'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: activeTab === 'stock' ? 5 + estadosStock.length : 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'stock' ? (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Material</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Almacén</th>
                          {estadosStock.map((es) => (
                            <th key={es.id} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">{es.descripcion}</th>
                          ))}
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Últ. Movimiento</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stockData.length === 0 ? (
                          <tr>
                            <td colSpan={4 + estadosStock.length} className="px-4 py-12 text-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                              No se encontraron registros de stock con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          stockData.map((row, idx) => (
                            <tr key={`${row.material_id}_${row.almacen_id}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex flex-col min-w-0 max-w-[220px]">
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                    {row.material.codigo}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                    {row.material.descripcion}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  {row.almacen.descripcion}
                                </span>
                              </td>
                              {estadosStock.map((es) => (
                                <td key={es.id} className="px-3 py-3 text-right">
                                  <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">
                                    {row.stock_por_estado[es.id] ? row.stock_por_estado[es.id].cantidad.toFixed(2) : '0.00'}
                                  </span>
                                </td>
                              ))}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    {fmtDate(row.ultimo_movimiento)}
                                  </span>
                                  {row.ultimo_movimiento && (
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {format(new Date(row.ultimo_movimiento), 'HH:mm', { locale: es })}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => openDetail(row)}
                                  className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-center mx-auto"
                                  title="Ver detalle de stock"
                                >
                                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {stockData.length > 0 && (
                  <div className="print:hidden">
                    <Pagination
                      page={pageStock}
                      totalPages={Math.ceil(totalStock / pageSize)}
                      onPage={setPageStock}
                      pageSize={pageSize}
                      onPageSize={(s) => { setPageSize(s); setPageStock(1) }}
                      total={totalStock}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha / Hora</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Sucursal</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Almacén</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lote</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ubicación</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Estado Stock</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Cantidad</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">U.M.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historialData.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                              No se encontraron registros de historial con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          historialData.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {fmtDt(row.updated_at)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {row.sucursal?.descripcion || '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {row.almacen?.descripcion || '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-mono text-slate-500">
                                  {row.numero_lote || <span className="text-slate-300 dark:text-slate-600">---</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] text-slate-500">
                                  {row.ubicacion ? `${row.ubicacion.codigo} - ${row.ubicacion.descripcion}` : '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {row.estado_stock?.descripcion || '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                                  {Number(row.cantidad).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  {row.unidad_medida?.abreviatura || '---'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {historialData.length > 0 && (
                  <div className="print:hidden">
                    <Pagination
                      page={pageHistorial}
                      totalPages={Math.ceil(totalHistorial / pageSize)}
                      onPage={setPageHistorial}
                      pageSize={pageSize}
                      onPageSize={(s) => { setPageSize(s); setPageHistorial(1) }}
                      total={totalHistorial}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <DetailModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          row={detailRow}
        />
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          @page {
            size: landscape;
            margin: 12mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          table {
            font-size: 9px !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th {
            background: #f1f5f9 !important;
            color: #334155 !important;
            font-weight: 700 !important;
            padding: 4px 6px !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 8px !important;
          }
          td {
            padding: 3px 6px !important;
            border: 1px solid #e2e8f0 !important;
            color: #1e293b !important;
            font-size: 8px !important;
          }
        }
      `}</style>
    </SucursalGuard>
  )
}
