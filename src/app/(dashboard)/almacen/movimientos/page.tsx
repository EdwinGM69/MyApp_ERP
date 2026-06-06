'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import Pagination from '@/components/ui/Pagination'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import SucursalGuard from '@/components/SucursalGuard'
import { useSucursal } from '@/contexts/SucursalContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { apiFetch } from '@/hooks/useAuth'
import { usePermisos } from '@/contexts/PermisosContext'

// ── Helpers ─────────────────────────────────────────────────
function fmtDate(dateStr?: string | null, fmt = 'dd MMM yyyy') {
  try {
    if (!dateStr) return '---'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '---'
    return format(d, fmt, { locale: es })
  } catch { return '---' }
}

function fmtTime(dateStr?: string | null) {
  try {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return format(d, 'HH:mm', { locale: es })
  } catch { return '' }
}

// ── Status helpers ──────────────────────────────────────────
const OP_COLORS = {
  ingreso: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20',
    icon: 'south_west',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  egreso: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20',
    icon: 'north_east',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  neutral: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700',
    icon: 'swap_horiz',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  },
}

function getOpVariant(signo?: string): keyof typeof OP_COLORS {
  if (signo === '+') return 'ingreso'
  if (signo === '-') return 'egreso'
  return 'neutral'
}

// ── MovimientoCard ──────────────────────────────────────────
function MovimientoCard({ mov, onView }: {
  mov: any
  onView: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const permisos = usePermisos()
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const variant = getOpVariant(mov.tipo_operacion?.signo_origen)
  const oc = OP_COLORS[variant]

  const entidad = mov.proveedor?.nombre || mov.cliente?.nombre || null
  const tipoEntidad = mov.proveedor ? 'Proveedor' : mov.cliente ? 'Cliente' : null
  const itemCount = mov._count?.detalles ?? 0

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !detail) {
      setLoadingDetail(true)
      try {
        const res = await apiFetch(`/api/almacen?id=${mov.id}`)
        const json = await res.json()
        setDetail(json.data)
      } catch { /* silent */ }
      finally { setLoadingDetail(false) }
    }
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200",
      expanded
        ? "border-indigo-400/40 dark:border-indigo-500/30 shadow-lg shadow-indigo-500/5"
        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300/40 dark:hover:border-indigo-500/20 hover:shadow-md"
    )}>

      {/* ━━━ CARD PRINCIPAL ━━━ */}
      <div className="flex items-stretch gap-0 px-3 py-2.5">

        {/* Ícono */}
        <div className="shrink-0 flex items-center pr-3 mr-3 border-r border-slate-100 dark:border-slate-800">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", oc.iconBg)}>
            <span className="material-symbols-outlined text-[17px]">{oc.icon}</span>
          </div>
        </div>

        {/* N° Mov + Entidad */}
        <div className="flex flex-col justify-center min-w-0 w-[200px] shrink-0 mr-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {mov.numero_mov}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
              {entidad || 'Sin entidad'}
            </span>
            {tipoEntidad && (
              <span className="text-[9px] text-slate-400 truncate">
                {tipoEntidad}
              </span>
            )}
          </div>
        </div>

        {/* Fecha */}
        <div className="hidden md:flex flex-col justify-center shrink-0 mr-5 min-w-[80px]">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{fmtDate(mov.fecha || mov.created_at)}</span>
        </div>

        {/* Operación + Sucursal */}
        <div className="flex items-center gap-4 mr-4 flex-1">
          <div className="hidden xl:flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Operación</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
              {mov.tipo_operacion?.descripcion || '---'}
            </span>
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sucursal</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
              {mov.sucursal?.descripcion || '---'}
            </span>
          </div>
          <div className="hidden sm:flex flex-col items-end ml-auto">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Referencia</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
              {mov.documento || mov.referencia || '---'}
            </span>
          </div>
          <div className="flex flex-col items-center ml-auto">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ítems</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{itemCount}</span>
          </div>
        </div>

        {/* Badge tipo operación */}
        <div className={cn(
          "hidden sm:flex shrink-0 self-center items-center gap-1.5 px-2 py-0.5 rounded-lg ring-1 text-[9px] font-bold uppercase tracking-wider mr-3",
          oc.badge
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", oc.dot)} />
          {variant === 'ingreso' ? 'Ingreso' : variant === 'egreso' ? 'Egreso' : 'Neutro'}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0 self-center">
          {permisos.exportar && (
            <button
              className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center active:scale-90"
              title="Imprimir"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
            </button>
          )}
          <button
            onClick={handleExpand}
            className={cn(
              "w-7 h-7 rounded-lg transition-all flex items-center justify-center active:scale-90 ml-0.5",
              expanded
                ? "bg-indigo-600 text-white shadow shadow-indigo-600/30"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <span className={cn("material-symbols-outlined text-[16px] transition-transform duration-200", expanded && "rotate-180")}>
              keyboard_arrow_down
            </span>
          </button>
        </div>
      </div>

      {/* ━━━ PANEL RETRÁCTIL ━━━ */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 mx-3" />

          {loadingDetail ? (
            <div className="p-6 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Cargando detalle...</span>
            </div>
          ) : detail ? (
            <div className="p-4 pt-3 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">

              {/* Columna izquierda: Detalle de materiales */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="material-symbols-outlined text-[16px] text-indigo-500">list_alt</span>
                      <span className="text-[11px] font-black uppercase tracking-wider">Detalle de Materiales</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                      {detail.detalles?.length || 0} {(detail.detalles?.length || 0) === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>

                  {/* Tabla */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-left px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Material / Código</th>
                          <th className="text-right px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cant.</th>
                          <th className="text-center px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                          <th className="text-right px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo U.</th>
                          <th className="text-left px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                          <th className="text-right px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Distribuciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!detail.detalles || detail.detalles.length === 0) && (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-[10px] text-slate-400">Sin ítems registrados</td>
                          </tr>
                        )}
                        {detail.detalles?.map((d: any, idx: number) => (
                          <tr key={d.id} className={cn("border-b border-slate-50 dark:border-slate-800/50", idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                            <td className="px-3 py-2">
                              <p className="font-bold text-slate-800 dark:text-slate-100">{d.material?.descripcion || '---'}</p>
                              <p className="text-[9px] text-slate-400">SKU: {d.material?.codigo || '---'}</p>
                            </td>
                            <td className="text-right px-2 py-2 font-bold text-slate-700 dark:text-slate-300">{Number(d.cantidad)}</td>
                            <td className="text-center px-2 py-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 uppercase">
                                {d.estado_stock?.descripcion || '---'}
                              </span>
                            </td>
                            <td className="text-right px-2 py-2 text-slate-600 dark:text-slate-300">
                              {d.costo_unit ? Number(d.costo_unit).toFixed(2) : '---'}
                            </td>
                            <td className="text-left px-2 py-2 text-slate-500 text-[10px]">
                              {d.numero_lote || '---'}
                            </td>
                            <td className="text-right px-3 py-2 font-bold text-slate-600 dark:text-slate-300">
                              {d.distribuciones?.length || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Info del movimiento */}
              <div className="flex flex-col gap-2">

                {/* Info General (oscuro) */}
                <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 flex flex-col gap-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Información del Movimiento</p>

                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                        variant === 'ingreso' ? 'bg-emerald-600' : variant === 'egreso' ? 'bg-blue-600' : 'bg-slate-600'
                      )}>
                        <span className="material-symbols-outlined text-white text-[12px]">inventory</span>
                      </div>
                      <div className="w-px bg-slate-700 my-1" style={{ minHeight: 12 }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Movimiento</p>
                      <p className="text-[11px] font-bold text-white">
                        {detail.numero_mov}
                        <span className="text-[10px] text-slate-400 font-medium"> · {fmtDate(detail.fecha || detail.created_at)} · {fmtTime(detail.fecha || detail.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[12px]">settings</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Operación</p>
                      <p className="text-[11px] font-bold text-white truncate">{detail.tipo_operacion?.descripcion || '---'}</p>
                      <p className="text-[10px] text-slate-400">Código: {detail.tipo_operacion?.codigo || '---'}</p>
                    </div>
                  </div>
                </div>

                {/* Referencias */}
                <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 flex flex-col">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Referencias</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">Documento</span>
                      <span className="text-[10px] font-bold text-white">{detail.documento || '---'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">Referencia</span>
                      <span className="text-[10px] font-bold text-white">{detail.referencia || '---'}</span>
                    </div>
                    {detail.numero_pedido && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">N° Pedido</span>
                        <span className="text-[10px] font-bold text-white">{detail.numero_pedido}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-400">Sucursal</span>
                      <span className="text-[10px] font-bold text-white">{detail.sucursal?.descripcion || '---'}</span>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {detail.observaciones && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-800/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">{detail.observaciones}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── MovimientosPage ─────────────────────────────────────────
export default function MovimientosPage() {
  const router = useRouter()
  const { currentSucursal } = useSucursal()
  const permisos = usePermisos()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
      if (currentSucursal?.id) params.set('sucursalId', String(currentSucursal.id))
      const res = await apiFetch(`/api/almacen?${params}`)
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
  }, [page, pageSize, search, currentSucursal])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchData() }

  const handleView = (id: number) => {
    router.push(`/almacen/movimientos/${id}`)
  }

  return (
    <SucursalGuard moduleName="Inventario">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Gestión de Inventarios / Movimientos" />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-2xl gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por N° movimiento, documento o referencia..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </form>

              <div className="flex items-center gap-3 shrink-0">
                {permisos.exportar && (
                  <button className="h-11 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">file_download</span>
                    Exportar
                  </button>
                )}
                {permisos.crear && (
                  <button
                    onClick={() => router.push('/almacen/movimientos/nuevo')}
                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nuevo Movimiento
                  </button>
                )}
              </div>
            </div>

            {/* Lista de movimientos */}
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="font-bold uppercase tracking-widest text-xs">Cargando movimientos...</p>
                  </div>
                </div>
              ) : data.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-3 block text-slate-300">search_off</span>
                  <p className="font-bold uppercase tracking-widest text-xs">No se encontraron movimientos.</p>
                </div>
              ) : (
                data.map((mov) => (
                  <MovimientoCard
                    key={mov.id}
                    mov={mov}
                    onView={handleView}
                  />
                ))
              )}
            </div>

            {/* Paginación */}
            <div className="px-4 py-3 mt-6 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={setPage}
                pageSize={pageSize}
                onPageSize={(s) => { setPageSize(s); setPage(1) }}
                total={total}
              />
            </div>

          </div>
        </main>
      </div>
    </SucursalGuard>
  )
}
