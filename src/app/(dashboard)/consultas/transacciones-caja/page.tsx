'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

import Topbar from '@/components/layout/Topbar'
import Pagination from '@/components/ui/Pagination'
import SucursalGuard from '@/components/SucursalGuard'
import { apiFetch } from '@/hooks/useAuth'
import { cn, formatCurrency } from '@/lib/utils'

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

function getOpStyle(tipoOperacion?: string) {
  if (tipoOperacion === 'Ingreso') return OP_STYLES.ingreso
  if (tipoOperacion === 'Egreso') return OP_STYLES.egreso
  return OP_STYLES.neutral
}

function fmtDt(dateStr?: string | Date | null) {
  try {
    if (!dateStr) return '---'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '---'
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return '---'
  }
}

function fmtImporte(importe: number | string, simbolo: string) {
  return formatCurrency(Math.abs(Number(importe)), { symbol: simbolo })
}

function getFirstDayOfMonth() {
  const d = new Date()
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd')
}

export default function ConsultaTransaccionesCajaPage() {
  const [activeTab, setActiveTab] = useState<'transacciones' | 'historial'>('transacciones')

  const [cajaId, setCajaId] = useState('')
  const [cajas, setCajas] = useState<{ id: number; codigo: string; descripcion: string }[]>([])
  const [fechaDesde, setFechaDesde] = useState(getFirstDayOfMonth)
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [busquedaActiva, setBusquedaActiva] = useState(false)

  const [transacciones, setTransacciones] = useState<any[]>([])
  const [totalTransacciones, setTotalTransacciones] = useState(0)
  const [pageTrans, setPageTrans] = useState(1)

  const [historial, setHistorial] = useState<any[]>([])
  const [totalHistorial, setTotalHistorial] = useState(0)
  const [pageHist, setPageHist] = useState(1)

  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    apiFetch('/api/tesoreria/cajas')
      .then((r) => r.json())
      .then((j) => setCajas(j.data || []))
      .catch(() => toast.error('Error al cargar cajas'))
  }, [])
  const [fetchKey, setFetchKey] = useState(0)

  const fetchData = useCallback(
    async (exportMode = false) => {
      setLoading(true)
      try {
        const isTransacciones = activeTab === 'transacciones'
        const params = new URLSearchParams()
        params.set('tipo', isTransacciones ? 'transacciones' : 'historial')
        if (cajaId) params.set('cajaId', cajaId)
        if (fechaDesde) params.set('fecha_desde', fechaDesde)
        if (fechaHasta) params.set('fecha_hasta', fechaHasta)

        if (!exportMode) {
          params.set('page', String(isTransacciones ? pageTrans : pageHist))
          params.set('pageSize', String(pageSize))
        } else {
          params.set('pageSize', '10000')
          params.set('page', '1')
        }

        const res = await apiFetch(`/api/consultas/transacciones-caja?${params}`)
        const json = await res.json()
        if (json.data) {
          if (exportMode) return json
          if (isTransacciones) {
            setTransacciones(json.data)
            setTotalTransacciones(json.total)
          } else {
            setHistorial(json.data)
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
    [activeTab, cajaId, fechaDesde, fechaHasta, pageTrans, pageHist, pageSize]
  )

  useEffect(() => {
    if (fetchKey > 0) {
      fetchData()
    }
  }, [pageTrans, pageHist, pageSize, activeTab, fetchKey])

  const handleSearch = () => {
    setPageTrans(1)
    setPageHist(1)
    setBusquedaActiva(true)
    setFetchKey(k => k + 1)
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

      const isTransacciones = activeTab === 'transacciones'
      let headers: string[]
      let rows: any[][]

      if (isTransacciones) {
        headers = [
          'Fecha / Hora', 'Tipo Operación', 'Concepto',
          'Referencia', 'Usuario', 'Importe',
        ]
        rows = allData.map((t: any) => [
          fmtDt(t.fecha_documento),
          t.concepto?.tipo_operacion || '---',
          `${t.concepto?.codigo || ''} - ${t.concepto?.descripcion || ''}`,
          t.referencia,
          t.usuario_creador?.nombre || '---',
          fmtImporte(t.importe, t.moneda?.simbolo || ''),
        ])
      } else {
        headers = [
          'Fecha/Hora Apertura', 'Tipo Apertura', 'Importe Apertura',
          'Usuario Apertura', 'Tipo Cierre', 'Importe Cierre', 'Usuario Cierre',
        ]
        rows = allData.map((s: any) => [
          fmtDt(s.fecha_apertura),
          'Apertura',
          fmtImporte(s.monto_apertura, s.moneda?.simbolo || ''),
          s.usuario_apertura?.nombre || '---',
          s.fecha_cierre ? 'Cierre' : '---',
          s.monto_cierre ? fmtImporte(s.monto_cierre, s.moneda?.simbolo || '') : '---',
          s.usuario_cierre?.nombre || '---',
        ])
      }

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, isTransacciones ? 'Transacciones' : 'Historial')

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbOut], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      const prefix = isTransacciones ? 'transacciones_caja' : 'historial_caja'
      a.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(`Error al exportar: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const currentTotal = activeTab === 'transacciones' ? totalTransacciones : totalHistorial

  const tabs = [
    { id: 'transacciones' as const, label: 'Transacciones', icon: 'receipt_long' },
    { id: 'historial' as const, label: 'Historial Apertura / Cierre', icon: 'history' },
  ]

  return (
    <SucursalGuard moduleName="Caja">
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <Topbar title="Consulta de Transacciones de Caja" />

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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Caja</label>
                  <select
                    value={cajaId}
                    onChange={(e) => setCajaId(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="">Todas las cajas</option>
                    {cajas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.descripcion}
                      </option>
                    ))}
                  </select>
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
              {/* Tabs */}
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

              {/* Actions */}
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
                  <p className="text-sm">Utilice los filtros y presione Buscar para consultar transacciones.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      {activeTab === 'transacciones'
                        ? ['Fecha / Hora', 'Tipo Op.', 'Concepto', 'Referencia', 'Usuario', 'Importe'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))
                        : ['Fecha/Hora Apertura', 'Tipo Apertura', 'Importe Apertura', 'Usuario Apertura', 'Tipo Cierre', 'Importe Cierre', 'Usuario Cierre'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: activeTab === 'transacciones' ? 6 : 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'transacciones' ? (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha / Hora</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipo Op.</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Concepto</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Referencia</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {transacciones.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                              No se encontraron transacciones con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          transacciones.map((t) => {
                            const style = getOpStyle(t.concepto?.tipo_operacion)
                            return (
                              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {fmtDt(t.fecha_documento)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
                                      <span className={cn('material-symbols-outlined text-sm', style.color)}>{style.icon}</span>
                                    </div>
                                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md ring-1', style.badge)}>
                                      {style.label}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col min-w-0 max-w-[240px]">
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {t.concepto?.descripcion || '---'}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 truncate">
                                      {t.concepto?.codigo || ''}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate block">
                                    {t.referencia}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    {t.usuario_creador?.nombre || '---'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                                    {fmtImporte(t.importe, t.moneda?.simbolo || '')}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {transacciones.length > 0 && (
                  <div className="print:hidden">
                    <Pagination
                      page={pageTrans}
                      totalPages={Math.ceil(totalTransacciones / pageSize)}
                      onPage={setPageTrans}
                      pageSize={pageSize}
                      onPageSize={(s) => { setPageSize(s); setPageTrans(1) }}
                      total={totalTransacciones}
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
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha/Hora Apertura</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipo Apertura</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Importe Apertura</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Usuario Apertura</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Tipo Cierre</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Importe Cierre</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Usuario Cierre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historial.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                              No se encontraron registros de apertura/cierre con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          historial.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {fmtDt(s.fecha_apertura)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">lock_open</span>
                                  </div>
                                  <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md ring-1">
                                    Apertura
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                                  {fmtImporte(s.monto_apertura, s.moneda?.simbolo || '')}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  {s.usuario_apertura?.nombre || '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {s.fecha_cierre ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                                      <span className="material-symbols-outlined text-sm text-red-600 dark:text-red-400">lock</span>
                                    </div>
                                    <span className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md ring-1">
                                      Cierre
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400">---</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                                  {s.monto_cierre ? fmtImporte(s.monto_cierre, s.moneda?.simbolo || '') : '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  {s.usuario_cierre?.nombre || '---'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {historial.length > 0 && (
                  <div className="print:hidden">
                    <Pagination
                      page={pageHist}
                      totalPages={Math.ceil(totalHistorial / pageSize)}
                      onPage={setPageHist}
                      pageSize={pageSize}
                      onPageSize={(s) => { setPageSize(s); setPageHist(1) }}
                      total={totalHistorial}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
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
