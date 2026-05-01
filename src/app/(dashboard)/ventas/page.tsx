'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency } from '@/lib/utils'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import Pagination from '@/components/ui/Pagination'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import SucursalGuard from '@/components/SucursalGuard'
import { useSucursal } from '@/contexts/SucursalContext'

// ── Interfaces ─────────────────────────────────────────────
interface VentaDetalleCondicion {
  id: number
  descripcion_corta: string
  simbolo: string
  tipo: string
  valor_condicion: number
  importe: number
}

interface VentaDetalle {
  id: number
  material: { id: number; codigo: string; descripcion: string } | null
  unidad_medida: { id: number; abreviatura: string } | null
  cantidad: number
  precio_unit: number
  descuento: number
  descuento_cupon: number
  descuento_promocion: number
  impuesto: number
  subtotal: number
  condiciones: VentaDetalleCondicion[]
}

interface VentaMedioPago {
  id: number
  importe: number
  medio_pago: { id: number; descripcion: string } | null
}

interface FlujoDocumentos {
  venta: { id: number; created_at: string } | null
  caja: { id: number; created_at: string } | null
  almacen: { id: number; numero_mov: string; created_at: string } | null
}

interface Venta {
  id: string
  numero_pedido: string
  comprobante?: string
  cliente: { id: number; nombre: string; codigo: string; tipo: string; nif?: string } | null
  sucursal: { id: number; descripcion: string } | null
  moneda: { id: number; descripcion: string; simbolo: string } | null
  dcto_identificacion: { id: number; abreviatura: string; descripcion: string } | null
  fecha_venta: string
  subtotal: number
  descuento: number
  descuento_cupon: number
  descuento_promocion: number
  impuesto: number
  total: number
  estado: string
  observaciones?: string
  detalles: VentaDetalle[]
  medios_pago: VentaMedioPago[]
  flujo_documentos: FlujoDocumentos
}

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

const STATUS_COLORS = {
  success: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20',
    pulse: true,
  },
  warning: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/20',
    pulse: false,
  },
  error: {
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/20',
    pulse: false,
  },
  neutral: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700',
    pulse: false,
  },
}

function getStatusVariant(estado: string): keyof typeof STATUS_COLORS {
  switch (estado?.toLowerCase()) {
    case 'procesada': return 'success'
    case 'cotizacion': return 'warning'
    case 'anulada': return 'error'
    default: return 'neutral'
  }
}

// ── VentaCard ────────────────────────────────────────────────
function VentaCard({ venta, monedaSimbolo, onAnular }: {
  venta: Venta
  monedaSimbolo: string
  onAnular: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sv = getStatusVariant(venta.estado)
  const sc = STATUS_COLORS[sv]
  const sym = venta.moneda?.simbolo || monedaSimbolo
  const fmt = (n: number) => formatCurrency(n, { symbol: sym })

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200",
      expanded
        ? "border-blue-400/40 dark:border-blue-500/30 shadow-lg shadow-blue-500/5"
        : "border-slate-200 dark:border-slate-800 hover:border-blue-300/40 dark:hover:border-blue-500/20 hover:shadow-md"
    )}>

      {/* ━━━━━━━━━━━━━ CARD PRINCIPAL (compacto) ━━━━━━━━━━━━━ */}
      <div className="flex items-stretch gap-0 px-3 py-2.5">

        {/* Ícono */}
        <div className="shrink-0 flex items-center pr-3 mr-3 border-r border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <span className="material-symbols-outlined text-[17px]">receipt_long</span>
          </div>
        </div>

        {/* PED # + cliente */}
        <div className="flex flex-col justify-center min-w-0 w-[200px] shrink-0 mr-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {venta.numero_pedido}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
              {venta.cliente?.nombre || 'Consumidor Final'}
            </span>
            {venta.cliente?.nif && (
              <span className="text-[9px] text-slate-400 truncate">
                {venta.dcto_identificacion?.abreviatura || 'DOC'}: {venta.cliente.nif}
              </span>
            )}
          </div>
        </div>

        {/* Fecha */}
        <div className="hidden md:flex flex-col justify-center shrink-0 mr-5 min-w-[80px]">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{fmtDate(venta.fecha_venta)}</span>
        </div>

        {/* Financials: subtotal · descuento · impuesto · total */}
        <div className="flex items-center gap-4 mr-4 flex-1">
          <div className="hidden xl:flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{fmt(Number(venta.subtotal))}</span>
          </div>
          <div className="hidden xl:flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Descuento</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{fmt(Number(venta.descuento) + Number(venta.descuento_cupon) + Number(venta.descuento_promocion))}</span>
          </div>
          <div className="flex flex-col items-end ml-auto">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{fmt(Number(venta.total))}</span>
          </div>
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Impuesto</span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{fmt(Number(venta.impuesto))}</span>
          </div>
        </div>

        {/* Estado badge */}
        <div className={cn(
          "hidden sm:flex shrink-0 self-center items-center gap-1.5 px-2 py-0.5 rounded-lg ring-1 text-[9px] font-bold uppercase tracking-wider mr-3",
          sc.badge
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot, sc.pulse && "animate-pulse")} />
          {venta.estado}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0 self-center">
          <button className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center active:scale-90" title="Imprimir">
            <span className="material-symbols-outlined text-[16px]">print</span>
          </button>
          <button
            onClick={() => onAnular(venta.id)}
            disabled={venta.estado === 'anulada'}
            className={cn(
              "w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex items-center justify-center active:scale-90",
              venta.estado === 'anulada' && "opacity-50 cursor-not-allowed hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
            title="Anular"
          >
            <span className="material-symbols-outlined text-[16px]">block</span>
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className={cn(
              "w-7 h-7 rounded-lg transition-all flex items-center justify-center active:scale-90 ml-0.5",
              expanded
                ? "bg-blue-600 text-white shadow shadow-blue-600/30"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <span className={cn("material-symbols-outlined text-[16px] transition-transform duration-200", expanded && "rotate-180")}>
              keyboard_arrow_down
            </span>
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━ PANEL RETRÁCTIL ━━━━━━━━━━━━━ */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 dark:border-slate-800 mx-3" />

          <div className="p-4 pt-3 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">

            {/* ── Columna izquierda: Detalle items ── */}
            <div className="flex flex-col gap-4">

              {/* Detalle de Productos (VentaDetalle) */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">list_alt</span>
                    <span className="text-[11px] font-black uppercase tracking-wider">Detalle de Productos</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                    {venta.detalles.length} {venta.detalles.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Material / Descripción</th>
                        <th className="text-right px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cant.</th>
                        <th className="text-center px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">UM</th>
                        <th className="text-right px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">P. Unit.</th>
                        <th className="text-right px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Desc.</th>
                        <th className="text-right px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {venta.detalles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-[10px] text-slate-400">Sin ítems registrados</td>
                        </tr>
                      )}
                      {venta.detalles.map((d, idx) => (
                        <Fragment key={d.id}>
                          <tr className={cn("border-b border-slate-50 dark:border-slate-800/50", idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                            <td className="px-3 py-2">
                              <p className="font-bold text-slate-800 dark:text-slate-100">{d.material?.descripcion || '---'}</p>
                              <p className="text-[9px] text-slate-400">SKU: {d.material?.codigo || '---'}</p>
                            </td>
                            <td className="text-right px-2 py-2 font-bold text-slate-700 dark:text-slate-300">{Number(d.cantidad)}</td>
                            <td className="text-center px-2 py-2 text-slate-500 font-semibold uppercase">{d.unidad_medida?.abreviatura || '---'}</td>
                            <td className="text-right px-2 py-2 text-slate-600 dark:text-slate-300">{fmt(Number(d.precio_unit))}</td>
                            <td className="text-right px-2 py-2 text-slate-500">{fmt(Number(d.descuento) + Number(d.descuento_cupon) + Number(d.descuento_promocion))}</td>
                            <td className="text-right px-3 py-2 font-black text-slate-800 dark:text-slate-100">{fmt(Number(d.subtotal))}</td>
                          </tr>
                          {d.condiciones.length > 0 && (
                            <tr className="bg-blue-50/30 dark:bg-blue-500/5">
                              <td colSpan={6} className="px-3 py-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {d.condiciones.map(c => (
                                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                      <span className="text-blue-500">{c.descripcion_corta}</span>
                                      <span>{c.simbolo}{Number(c.valor_condicion)}</span>
                                      <span className="text-slate-400">→ {fmt(Number(c.importe))}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ── Columna derecha: Flujo de documentos (oscuro) ── */}
            <div className="flex flex-col gap-2">

              {/* Flujo de Documentos (card oscuro) */}
              <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 flex flex-col">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Flujo de Documentos</p>

                {/* Nodo Venta */}
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[12px]">shopping_cart</span>
                    </div>
                    {(venta.flujo_documentos.caja || venta.flujo_documentos.almacen) && (
                      <div className="w-px bg-slate-700 my-1" style={{ minHeight: 12 }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Venta</p>
                    <p className="text-[11px] font-bold text-white">
                      {venta.numero_pedido}
                      {venta.flujo_documentos.venta && (
                        <span className="text-[10px] text-slate-400 font-medium"> · {fmtDate(venta.flujo_documentos.venta.created_at)} · {fmtTime(venta.flujo_documentos.venta.created_at)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Nodo Caja */}
                {venta.flujo_documentos.caja && (
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[12px]">point_of_sale</span>
                      </div>
                      {venta.flujo_documentos.almacen && (
                        <div className="w-px bg-slate-700 my-1" style={{ minHeight: 12 }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Caja</p>
                      <p className="text-[11px] font-bold text-white">ID: {venta.flujo_documentos.caja.id}
                        <span className="text-[10px] text-slate-400"> · {fmtDate(venta.flujo_documentos.caja.created_at)} · {fmtTime(venta.flujo_documentos.caja.created_at)}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Nodo Almacén */}
                {venta.flujo_documentos.almacen && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-[12px]">inventory</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Inventario</p>
                      <p className="text-[11px] font-bold text-white">ID: {venta.flujo_documentos.almacen.id}
                        <span className="text-[10px] text-slate-400"> · {fmtDate(venta.flujo_documentos.almacen.created_at)} · {fmtTime(venta.flujo_documentos.almacen.created_at)}</span>
                      </p>
                      <p className="text-[11px] font-bold text-white">N° {venta.flujo_documentos.almacen.numero_mov}</p>
                    </div>
                  </div>
                )}

                {/* Sin flujo */}
                {!venta.flujo_documentos.venta && !venta.flujo_documentos.caja && !venta.flujo_documentos.almacen && (
                  <p className="text-[10px] text-slate-500 italic">Sin flujo de documentos registrado</p>
                )}
              </div>

              {/* Medios de Pago (oscuro) */}
              <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-2.5 flex flex-col">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Medios de Pago</p>
                {venta.medios_pago.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">Sin medios de pago registrados</p>
                )}
                {venta.medios_pago.map(mp => (
                  <div key={mp.id} className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-medium text-slate-300">{mp.medio_pago?.descripcion || '---'}</span>
                    <span className="text-[10px] font-bold text-white">{fmt(Number(mp.importe))}</span>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              {(venta.sucursal || venta.observaciones) && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-800/60 flex flex-col gap-1">
                  {venta.observaciones && (
                    <p className="text-[10px] text-slate-400 italic">{venta.observaciones}</p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── VentasPage ──────────────────────────────────────────────
export default function VentasPage() {
  const { currentSucursal } = useSucursal()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const monedaSimbolo = useAuthStore(state => state.user?.monedaSimbolo || '$')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
      if (currentSucursal?.id) params.set('sucursalId', String(currentSucursal.id))
      const res = await apiFetch(`/api/ventas?${params}`)
      if (!res.ok) throw new Error('Error fetching sales')
      const json = await res.json()
      setVentas(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, currentSucursal])

  useEffect(() => { fetchVentas() }, [fetchVentas])

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchVentas() }

  const handleAnular = async (id: string) => {
    if (!confirm('¿Está seguro de que desea anular esta venta?')) return
    try {
      const res = await apiFetch(`/api/ventas?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accion: 'anular' })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Venta anulada correctamente')
        fetchVentas()
      } else {
        toast.error(json.error || 'Error al anular la venta')
      }
    } catch {
      toast.error('Error al conectar con el servidor')
    }
  }

  return (
    <SucursalGuard moduleName="Ventas">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Gestión de Ventas / Facturación" />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
              </form>

              <div className="flex items-center gap-3 shrink-0">
                <button className="h-11 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  Exportar
                </button>
                <Link href="/ventas/nueva" className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nueva Venta
                </Link>
              </div>
            </div>

            {/* Lista de ventas */}
            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="font-bold uppercase tracking-widest text-xs">Cargando ventas...</p>
                  </div>
                </div>
              ) : ventas.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-3 block text-slate-300">search_off</span>
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

            {/* Paginación */}
            <div className="px-4 py-3 mt-6 border-t border-slate-100 dark:border-slate-800">
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
    </SucursalGuard>
  )
}
