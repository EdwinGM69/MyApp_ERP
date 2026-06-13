'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

const OP_STYLES = {
  ingreso: {
    icon: 'south_west',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20',
    label: 'Ingreso',
  },
  egreso: {
    icon: 'north_east',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20',
    label: 'Egreso',
  },
  neutral: {
    icon: 'swap_horiz',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    badge: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700',
    label: 'Neutro',
  },
}

function getOpStyle(signo?: string) {
  if (signo === '+') return OP_STYLES.ingreso
  if (signo === '-') return OP_STYLES.egreso
  return OP_STYLES.neutral
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

function fmtTime(dateStr?: string | null) {
  try {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return format(d, 'HH:mm', { locale: es })
  } catch {
    return ''
  }
}

interface KardexRow {
  id: number
  movimiento_id: number
  material_id: number
  cantidad: number
  costo_unit: number | null
  numero_lote: string | null
  ubicacion_codigo: string | null
  linea: string
  movimiento: {
    id: number
    numero_mov: string
    fecha: string
    created_at: string
    documento: string | null
    referencia: string | null
    tipo_operacion: {
      codigo: string
      descripcion: string
      signo_origen: string
      categoria: string
    } | null
    sucursal: { descripcion: string } | null
  } | null
  material: {
    id: number
    codigo: string
    descripcion: string
  } | null
  almacen: { id: number; descripcion: string } | null
  unidad_medida: { id: number; descripcion: string; abreviatura: string } | null
  estado_stock: { descripcion: string; codigo: string } | null
  distribuciones: Array<any>
}

// Detail modal component
function DetailModal({
  open,
  onClose,
  movimientoId,
  highlightMaterialId,
}: {
  open: boolean
  onClose: () => void
  movimientoId: number
  highlightMaterialId: number
}) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !movimientoId) return
    setLoading(true)
    apiFetch(`/api/almacen?id=${movimientoId}`)
      .then((res) => res.json())
      .then((json) => setDetail(json.data))
      .catch(() => toast.error('Error al cargar detalle'))
      .finally(() => setLoading(false))
  }, [open, movimientoId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-500 text-xl">list_alt</span>
            <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Detalle del Movimiento
            </span>
            {detail && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                #{detail.numero_mov}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Cargando detalle...</p>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-6">
              {/* Encabezado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Movimiento</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{detail.numero_mov}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{fmtDt(detail.fecha || detail.created_at)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operación</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{detail.tipo_operacion?.descripcion || '---'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sucursal</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{detail.sucursal?.descripcion || '---'}</p>
                </div>
              </div>

              {/* Referencias */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl px-4 py-3">
                <span><strong className="text-slate-700 dark:text-slate-300">Documento:</strong> {detail.documento || '---'}</span>
                <span><strong className="text-slate-700 dark:text-slate-300">Referencia:</strong> {detail.referencia || '---'}</span>
                {detail.numero_pedido && (
                  <span><strong className="text-slate-700 dark:text-slate-300">N° Pedido:</strong> {detail.numero_pedido}</span>
                )}
                {detail.observaciones && (
                  <span><strong className="text-slate-700 dark:text-slate-300">Obs:</strong> {detail.observaciones}</span>
                )}
              </div>

              {/* Detalle de materiales */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  Materiales ({detail.detalles?.length || 0})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Material</th>
                        <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cantidad</th>
                        <th className="text-left px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Almacén</th>
                        <th className="text-left px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lote</th>
                        <th className="text-left px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</th>
                        <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Costo U.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detail.detalles?.map((det: any) => {
                        const isHighlighted = det.material_id === highlightMaterialId
                        return (
                          <tr
                            key={det.id}
                            className={cn(
                              'transition-colors',
                              isHighlighted
                                ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isHighlighted && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-300 uppercase shrink-0">
                                    Seleccionado
                                  </span>
                                )}
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-slate-100">{det.material?.descripcion || '---'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{det.material?.codigo || '---'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-3 py-3 font-bold text-slate-700 dark:text-slate-300">
                              {Number(det.cantidad)}
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{det.almacen?.descripcion || '---'}</td>
                            <td className="px-3 py-3 text-slate-500">{det.numero_lote || '---'}</td>
                            <td className="px-3 py-3 text-slate-500 font-mono">
                              {det.distribuciones?.[0]?.ubicacion?.codigo || '---'}
                            </td>
                            <td className="text-right px-3 py-3 text-slate-600 dark:text-slate-300">
                              {det.costo_unit ? Number(det.costo_unit).toFixed(2) : '---'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-3">search_off</span>
              <p className="text-[10px] font-black uppercase tracking-widest">No se pudo cargar el detalle</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function groupByMaterial(rows: KardexRow[]): Array<{ materialId: number; material: KardexRow['material']; items: KardexRow[] }> {
  const groups: Record<number, { materialId: number; material: KardexRow['material']; items: KardexRow[] }> = {}
  for (const row of rows) {
    const id = row.material_id
    if (!groups[id]) {
      groups[id] = { materialId: id, material: row.material, items: [] }
    }
    groups[id].items.push(row)
  }
  return Object.values(groups)
}

export default function KardexPage() {
  const [data, setData] = useState<KardexRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [fechaDesde, setFechaDesde] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [materialIds, setMaterialIds] = useState<number[]>([])
  const [marcaIds, setMarcaIds] = useState<number[]>([])
  const [categoriaIds, setCategoriaIds] = useState<number[]>([])
  const [tipoIds, setTipoIds] = useState<number[]>([])
  const [fetchKey, setFetchKey] = useState(0)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailMovimientoId, setDetailMovimientoId] = useState(0)
  const [detailHighlightMaterialId, setDetailHighlightMaterialId] = useState(0)

  const tableRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(
    async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        if (materialIds.length > 0) params.set('materialIds', materialIds.join(','))
        if (marcaIds.length > 0) params.set('marcaIds', marcaIds.join(','))
        if (categoriaIds.length > 0) params.set('categoriaIds', categoriaIds.join(','))
        if (tipoIds.length > 0) params.set('tipoIds', tipoIds.join(','))
        if (fechaDesde) params.set('fecha_desde', fechaDesde)
        if (fechaHasta) params.set('fecha_hasta', fechaHasta)

        const res = await apiFetch(`/api/kardex?${params}`)
        const json = await res.json()
        if (json.data) {
          setData(json.data)
          setTotal(json.total)
          setTotalPages(json.totalPages)
        }
      } catch (err) {
        toast.error('Error al cargar kardex')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    },
    [page, pageSize, materialIds, marcaIds, categoriaIds, tipoIds, fechaDesde, fechaHasta]
  )

  useEffect(() => {
    if (fetchKey > 0) {
      fetchData()
    }
  }, [page, pageSize, fetchKey])

  const handleSearch = () => {
    setPage(1)
    setFetchKey(k => k + 1)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('pageSize', '10000')
      params.set('page', '1')
      if (materialIds.length > 0) params.set('materialIds', materialIds.join(','))
      if (marcaIds.length > 0) params.set('marcaIds', marcaIds.join(','))
      if (categoriaIds.length > 0) params.set('categoriaIds', categoriaIds.join(','))
      if (tipoIds.length > 0) params.set('tipoIds', tipoIds.join(','))
      if (fechaDesde) params.set('fecha_desde', fechaDesde)
      if (fechaHasta) params.set('fecha_hasta', fechaHasta)
      const res = await apiFetch(`/api/kardex?${params}`)
      const json = await res.json()
      const allData: KardexRow[] = json.data || []

      const headers = [
        'Código Material', 'Descripción',
        'Fecha/Hora', 'Tipo Movimiento',
        'Almacén', 'N° Lote', 'Ubicación',
        'Cantidad', 'U.M.', 'Referencia',
      ]
      const rows = allData.map((row) => [
        row.material?.codigo || '',
        row.material?.descripcion || '',
        fmtDt(row.movimiento?.fecha || row.movimiento?.created_at),
        row.movimiento?.tipo_operacion?.descripcion || '---',
        row.almacen?.descripcion || '---',
        row.numero_lote || '---',
        row.ubicacion_codigo || '---',
        Number(row.cantidad).toFixed(2),
        row.unidad_medida?.abreviatura || '---',
        row.movimiento?.documento || row.movimiento?.referencia || '---',
      ])

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, 'Kardex')

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbOut], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `kardex_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(`Error al exportar: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const openDetail = (movimientoId: number, materialId: number) => {
    setDetailMovimientoId(movimientoId)
    setDetailHighlightMaterialId(materialId)
    setDetailModalOpen(true)
  }

  const groups = groupByMaterial(data)

  return (
    <SucursalGuard moduleName="Inventario">
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <Topbar title="Kardex de Inventario" />

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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Marca</label>
                  <MultiSelect
                    endpoint="/api/marcas"
                    values={marcaIds}
                    onChange={setMarcaIds}
                    placeholder="Todas las marcas"
                    searchPlaceholder="Buscar marca..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Categoría</label>
                  <MultiSelect
                    endpoint="/api/materiales/categorias"
                    values={categoriaIds}
                    onChange={setCategoriaIds}
                    placeholder="Todas las categorías"
                    searchPlaceholder="Buscar categoría..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipo Material</label>
                  <MultiSelect
                    endpoint="/api/materiales/tipos"
                    values={tipoIds}
                    onChange={setTipoIds}
                    placeholder="Todos los tipos"
                    searchPlaceholder="Buscar tipo..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex items-center gap-3">
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
                  <span className="text-slate-300 text-xs mt-5">—</span>
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
                </div>

                <button
                  onClick={handleSearch}
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.12em] transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[17px]">search</span>
                  Buscar
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-4 print:hidden">
              <p className="text-xs text-slate-500">
                {isLoading ? 'Consultando...' : `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="h-9 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimir
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="h-9 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {exporting ? 'progress_activity' : 'file_download'}
                  </span>
                  {exporting ? 'Exportando...' : 'Exportar Excel'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div ref={tableRef} className="print:shadow-none print:border-none">
              {isLoading ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        {['Fecha / Hora', 'Tipo Mov.', 'Material', 'Almacén', 'N° Lote', 'Ubicación', 'Cantidad', 'U.M.', 'Referencia', 'Detalle'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 10 }).map((_, j) => (
                            <td key={j} className="px-4 py-4">
                              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : data.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">{fetchKey === 0 ? 'manage_search' : 'search_off'}</span>
                    <p className="text-sm">{fetchKey === 0 ? 'Utilice los filtros y presione Buscar para consultar el kardex.' : 'No se encontraron movimientos con los filtros seleccionados.'}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha / Hora</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipo Mov.</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Material</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Almacén</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">N° Lote</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Ubicación</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Cantidad</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">U.M.</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Referencia</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {groups.map((group) => (
                          <FragmentGroup key={group.materialId} group={group} openDetail={openDetail} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && data.length > 0 && (
              <div className="print:hidden">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={setPage}
                  pageSize={pageSize}
                  onPageSize={(s) => {
                    setPageSize(s)
                    setPage(1)
                  }}
                  total={total}
                />
              </div>
            )}
          </div>
        </main>

        <DetailModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          movimientoId={detailMovimientoId}
          highlightMaterialId={detailHighlightMaterialId}
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

function FragmentGroup({
  group,
  openDetail,
}: {
  group: { materialId: number; material: KardexRow['material']; items: KardexRow[] }
  openDetail: (movimientoId: number, materialId: number) => void
}) {
  return (
    <>
      {/* Material Header */}
      <tr className="bg-indigo-50 dark:bg-indigo-500/10">
        <td colSpan={10} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm text-indigo-600 dark:text-indigo-400">category</span>
            </span>
            <span className="text-[12px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-tight">
              {group.material?.codigo || '---'}
            </span>
            <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              {group.material?.descripcion || '---'}
            </span>
          </div>
        </td>
      </tr>
      {/* Movement rows */}
      {group.items.map((row) => (
        <tr
          key={row.id}
          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
        >
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {fmtDate(row.movimiento?.fecha || row.movimiento?.created_at)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {fmtTime(row.movimiento?.fecha || row.movimiento?.created_at)}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-1.5">
              {(() => {
                const style = getOpStyle(row.movimiento?.tipo_operacion?.signo_origen)
                return (
                  <>
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
                      <span className={cn('material-symbols-outlined text-sm', style.color)}>{style.icon}</span>
                    </div>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md ring-1', style.badge)}>
                      {style.label}
                    </span>
                  </>
                )
              })()}
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col min-w-0 max-w-[240px]">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                {row.material?.descripcion || '---'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {row.material?.codigo || ''}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {row.almacen?.descripcion || '---'}
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                #{row.almacen?.id ?? ''}
              </span>
            </div>
          </td>
          <td className="px-4 py-3 text-center">
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
              {row.numero_lote || <span className="text-slate-300 dark:text-slate-600">---</span>}
            </span>
          </td>
          <td className="px-4 py-3 text-center">
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {row.ubicacion_codigo || <span className="text-slate-300 dark:text-slate-600">---</span>}
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
          <td className="px-4 py-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[140px] truncate block">
              {row.movimiento?.documento || row.movimiento?.referencia || '---'}
            </span>
          </td>
          <td className="px-4 py-3 text-center">
            <button
              onClick={() => openDetail(row.movimiento_id, row.material_id)}
              className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-center mx-auto"
              title="Ver detalle del movimiento"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
          </td>
        </tr>
      ))}
    </>
  )
}
