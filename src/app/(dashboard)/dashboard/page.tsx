'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Badge from '@/components/ui/Badge'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import { cn, formatCurrency } from '@/lib/utils'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

interface Kpis {
  ventasDia: { total: number; count: number }
  ventasDiaSemanaPasada: number
  variacionVentas: number
  ticketPromedio: number
  margenBruto: number
  margenPorcentaje: number
  clientesAtendidos: number
  saldoCaja: { saldo: number; ingresos: number; egresos: number; sesionAbierta: boolean; detalle: string }
}

interface MaterialRow {
  id: number
  codigo: string
  descripcion: string
  unidad: string
  stock: number
  minimo: number
  diasRestantes: number | null
}

interface DashboardData {
  fechaGeneracion: string
  kpis: Kpis
  alertas: {
    cajaSinCierre: Array<{ id: number; caja: string; sucursal: string; usuario: string; fechaApertura: string; montoApertura: number }>
    descuadres: Array<{ id: number; caja: string; sucursal: string; fecha: string; diferencia: number; usuario: string }>
    stockBajo: { count: number; items: MaterialRow[] }
    quiebreInminente: { count: number }
    docsPendientes: { count: number; items: Array<{ id: number; numero_pedido: string; cliente: string; total: number; fecha: string }> }
    cobranzas: { vencidas: number; porVencer48h: number }
  }
  tendencias: {
    ventasDiarias: Array<{ fecha: string; total: number }>
    metaPromedio: number
    categorias: Array<{ nombre: string; total: number }>
  }
  listas: {
    quiebreStock: MaterialRow[]
    movimientosCaja: Array<{ id: number; fecha: string; concepto: string; tipoOperacion: string; persona: string | null; importe: number; monedaSimbolo: string; estado: string; esAnulacion: boolean }>
    clientesDeuda: Array<any>
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtPct(n: number): string {
  const v = Math.round(n * 10) / 10
  return `${v > 0 ? '+' : ''}${v}%`
}

function shortFecha(fecha: string): string {
  const [, m, d] = fecha.split('-')
  return `${d}/${m}`
}

function horaMin(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  } catch {
    return ''
  }
}

function fmtDias(dias: number | null, stock: number, minimo: number): string {
  if (stock <= 0) return 'Sin stock'
  if (dias == null) return 'Sin ventas (7d)'
  return `~${dias} día${dias === 1 ? '' : 's'}`
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes de UI
// ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg', className)} />
}

type ChipVariant = 'red' | 'orange' | 'amber' | 'blue' | 'green'

const chipVariants: Record<ChipVariant, { wrap: string; dot: string; icon: string }> = {
  red: {
    wrap: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/20',
    dot: 'bg-red-500',
    icon: 'text-red-500',
  },
  orange: {
    wrap: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200 dark:hover:bg-orange-500/20',
    dot: 'bg-orange-500',
    icon: 'text-orange-500',
  },
  amber: {
    wrap: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-500/20',
    dot: 'bg-amber-400',
    icon: 'text-amber-500',
  },
  blue: {
    wrap: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200 dark:hover:bg-blue-500/20',
    dot: 'bg-blue-500',
    icon: 'text-blue-500',
  },
  green: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: 'text-emerald-500',
  },
}

function AlertChip({
  href,
  variant,
  icon,
  title,
  children,
}: {
  href: string
  variant: ChipVariant
  icon: string
  title: string
  children: React.ReactNode
}) {
  const v = chipVariants[variant]
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full border px-4 py-2 transition-colors min-w-0',
        v.wrap
      )}
    >
      <span className={cn('size-2 rounded-full animate-pulse shrink-0', v.dot)} />
      <span className={cn('material-symbols-outlined text-lg shrink-0', v.icon)}>{icon}</span>
      <span className="text-sm font-bold whitespace-nowrap">{title}</span>
      <span className="text-xs font-semibold opacity-80 whitespace-nowrap">{children}</span>
      <span className="material-symbols-outlined text-base opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
        chevron_right
      </span>
    </Link>
  )
}

function KpiCard({
  title,
  value,
  icon,
  iconClass,
  children,
}: {
  title: string
  value: string
  icon: string
  iconClass: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
        <span className={cn('material-symbols-outlined text-xl', iconClass)}>{icon}</span>
      </div>
      <p className="text-3xl font-black mt-3 text-slate-900 dark:text-white leading-tight">{value}</p>
      {children && <div className="mt-auto pt-2 text-xs text-slate-400">{children}</div>}
    </div>
  )
}

function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h4>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col',
        className
      )}
    >
      {children}
    </div>
  )
}

// Tooltip consistente (funciona en modo claro/oscuro)
function MoneyTooltip({ active, payload, label, symbol }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700">
      {label != null && <p className="font-bold mb-1 text-slate-100">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-slate-300">
          <span className="inline-block size-2 rounded-full shrink-0" style={{ background: p.color || p.payload?.fill || p.fill }} />
          <span className="truncate max-w-[160px]">{p.name}:</span>
          <span className="font-semibold text-white">
            {formatCurrency(Number(p.value), { symbol })}
          </span>
        </p>
      ))}
    </div>
  )
}

function TrendChip({ value, positive, negative, zero }: { value: number; positive?: boolean; negative?: boolean; zero?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
        zero && 'text-slate-500 bg-slate-500/10',
        positive && 'text-green-600 bg-green-500/10 dark:text-green-400',
        negative && 'text-red-600 bg-red-500/10 dark:text-red-400'
      )}
    >
      {!zero && (
        <span className="material-symbols-outlined text-sm">{positive ? 'trending_up' : 'trending_down'}</span>
      )}
      {fmtPct(value)}
    </span>
  )
}

function CajaMovimiento({ m, symbol }: { m: DashboardData['listas']['movimientosCaja'][number]; symbol: string }) {
  const ingresos = m.importe > 0
  const anulacion = m.esAnulacion
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={cn(
          'size-9 rounded-lg flex items-center justify-center shrink-0',
          anulacion
            ? 'bg-slate-500/10 text-slate-500'
            : ingresos
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-500 dark:text-red-400'
        )}
      >
        <span className="material-symbols-outlined text-lg">
          {anulacion ? 'undo' : ingresos ? 'toll' : 'money_off'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {m.concepto}
          {anulacion && <span className="ml-1.5 text-[10px] font-bold text-slate-400">ANULACIÓN</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">{m.persona ?? 'Sin referencia'} · {horaMin(m.fecha)}</p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            'text-sm font-bold',
            anulacion ? 'text-slate-500 line-through' : ingresos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
          )}
        >
          {ingresos && !anulacion ? '+' : '−'}
          {formatCurrency(Math.abs(m.importe), { symbol: m.monedaSimbolo || symbol })}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const monedaSimbolo = useAuthStore((state) => state.user?.monedaSimbolo || '$')

  const cargar = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await apiFetch('/api/dashboard')
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'Error de respuesta')
      }
      setData(await res.json())
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    cargar()
    const timer = setInterval(cargar, 60_000) // refresco en vivo
    return () => clearInterval(timer)
  }, [cargar])

  const a = data?.alertas
  const redActive = !!a && (a.cajaSinCierre.length > 0 || a.descuadres.length > 0)
  const orangeActive = !!a && a.stockBajo.count > 0
  const amberActive = !!a && (a.cobranzas.vencidas > 0 || a.cobranzas.porVencer48h > 0)
  const blueActive = !!a && a.docsPendientes.count > 0
  const anyAlert = redActive || orangeActive || amberActive || blueActive

  const k = data?.kpis
  const t = data?.tendencias

  const ventasLine = (t?.ventasDiarias ?? []).map((e) => ({
    fecha: e.fecha,
    ventas: e.total,
  }))
  const categoriasBars = (t?.categorias ?? []).map((c) => ({
    nombre: c.nombre,
    ventas: c.total,
  }))
  const maxBar = categoriasBars.reduce((acc, b) => Math.max(acc, b.ventas), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Panel de Mando" />

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark">
        <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
          {/* ── Encabezado de contexto ── */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Visión ejecutivo-operativa</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Estado del negocio en tiempo real · {mounted ? new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              {data?.fechaGeneracion && (
                <span className="hidden sm:inline">Actualizado {horaMin(data.fechaGeneracion)}</span>
              )}
              <button
                onClick={cargar}
                disabled={refreshing || !mounted}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <span className={cn('material-symbols-outlined text-base', refreshing && 'animate-spin')}>
                  {refreshing ? 'progress_activity' : 'refresh'}
                </span>
                Actualizar
              </button>
            </div>
          </div>

          {/* ── CAPA 1 · Alertas críticas (siempre visible) ── */}
          <section aria-label="Alertas críticas">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-3 flex flex-wrap items-center gap-2.5">
              {loading ? (
                <Skeleton className="h-9 w-full max-w-[560px] rounded-full" />
              ) : error && !data ? (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 px-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span className="font-semibold">No se pudo cargar:</span>
                  <span className="text-xs">{error}</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div
                      className="w-full flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 px-1"
                      title={error}
                    >
                      <span className="material-symbols-outlined text-sm">sync_problem</span>
                      <span>
                        No se pudo actualizar ({horaMin(new Date().toISOString())}) — mostrando la última lectura.
                      </span>
                    </div>
                  )}
                  {redActive && (
                    <>
                      {a!.cajaSinCierre.length > 0 && (
                        <AlertChip href="/gestion-caja" variant="red" icon="bedtime" title="Caja abierta">
                          {a!.cajaSinCierre.length} sin cerrar de días anteriores
                        </AlertChip>
                      )}
                      {a!.descuadres.length > 0 && (
                        <AlertChip href="/gestion-caja" variant="red" icon="warning" title="Descuadre">
                          {a!.descuadres.length} arqueo{a!.descuadres.length > 1 ? 's' : ''} con diferencia
                        </AlertChip>
                      )}
                    </>
                  )}

                  {orangeActive && (
                    <AlertChip href="/consultas/stock" variant="orange" icon="inventory_2" title="Stock crítico">
                      {a!.stockBajo.count} producto{a!.stockBajo.count > 1 ? 's' : ''} bajo el mínimo
                      {a!.quiebreInminente.count > 0 && (
                        <span className="font-bold"> · {a!.quiebreInminente.count} en quiebre</span>
                      )}
                    </AlertChip>
                  )}

                  {amberActive && (
                    <AlertChip href="/consultas/transacciones-caja" variant="amber" icon="payments" title="Cobranzas">
                      {a!.cobranzas.vencidas} vencida{a!.cobranzas.vencidas > 1 ? 's' : ''}
                      {a!.cobranzas.porVencer48h > 0 && (
                        <span className="font-bold"> · {a!.cobranzas.porVencer48h} por vencer (48h)</span>
                      )}
                    </AlertChip>
                  )}

                  {blueActive && (
                    <AlertChip href="/ventas" variant="blue" icon="receipt_long" title="Documentos por confirmar">
                      {a!.docsPendientes.count} cotización{a!.docsPendientes.count > 1 ? 'es' : ''} pendiente{a!.docsPendientes.count > 1 ? 's' : ''}
                    </AlertChip>
                  )}

                  {!anyAlert && (
                    <AlertChip href="/dashboard" variant="green" icon="check_circle" title="Todo en orden">
                      Sin alertas críticas
                    </AlertChip>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── CAPA 2 · KPIs del día ── */}
          <section aria-label="Indicadores del día">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
              ) : (
                <>
                  <KpiCard
                    title="Ventas del día"
                    value={k ? formatCurrency(k!.ventasDia.total, { symbol: monedaSimbolo }) : '…'}
                    icon="payments"
                    iconClass="text-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{k?.ventasDia.count ?? 0} transacciones</span>
                      {k && (k.variacionVentas > 0.05 ? (
                        <TrendChip value={k.variacionVentas} positive />
                      ) : k.variacionVentas < -0.05 ? (
                        <TrendChip value={k.variacionVentas} negative />
                      ) : (
                        <TrendChip value={0} zero />
                      ))}
                    </div>
                  </KpiCard>

                  <KpiCard
                    title="Ticket promedio"
                    value={k ? formatCurrency(k!.ticketPromedio, { symbol: monedaSimbolo }) : '…'}
                    icon="receipt_long"
                    iconClass="text-purple-500"
                  >
                    <span>compra media por venta</span>
                  </KpiCard>

                  <KpiCard
                    title="Saldo de caja"
                    value={k ? formatCurrency(k!.saldoCaja.saldo, { symbol: monedaSimbolo }) : '…'}
                    icon="account_balance_wallet"
                    iconClass={k && k.saldoCaja.saldo < 0 ? 'text-red-500' : 'text-emerald-500'}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span className={cn('size-1.5 rounded-full', k?.saldoCaja.sesionAbierta ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
                        {k?.saldoCaja.sesionAbierta ? 'Sesión abierta' : 'Sin sesión'}
                      </span>
                      <span className="text-slate-400 truncate max-w-full">
                        Entradas +{k ? formatCurrency(k!.saldoCaja.ingresos, { symbol: '' }) : '0'} · Salidas −{k ? formatCurrency(k!.saldoCaja.egresos, { symbol: '' }) : '0'}
                      </span>
                    </div>
                  </KpiCard>

                  <KpiCard
                    title="Margen bruto"
                    value={k ? formatCurrency(k!.margenBruto, { symbol: monedaSimbolo }) : '…'}
                    icon="trending_up"
                    iconClass="text-blue-500"
                  >
                    <span>
                      {Math.round((k?.margenPorcentaje ?? 0) * 10) / 10}% del total vendido · estimado
                    </span>
                  </KpiCard>

                  <KpiCard
                    title="Clientes atendidos"
                    value={String(k?.clientesAtendidos ?? '…')}
                    icon="group"
                    iconClass="text-amber-500"
                  >
                    <span>distintos en el día</span>
                  </KpiCard>
                </>
              )}
            </div>
          </section>

          {/* ── CAPA 3 · Tendencias ── */}
          <section aria-label="Tendencias">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Línea de ventas 30 días */}
              <CardShell>
                <CardTitle
                  title="Ventas · últimos 30 días"
                  subtitle="Línea discontinua = promedio del período"
                  action={
                    <select
                      disabled
                      title="Rango fijo de 30 días"
                      className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-bold py-1 px-3 focus:ring-0 text-slate-700 dark:text-slate-200"
                    >
                      <option>30 días</option>
                    </select>
                  }
                />
                <div className="mt-4 flex-1 h-64">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : !ventasLine.length ? (
                    <EmptyChart text="Sin ventas registradas en el período" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ventasLine} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                        <XAxis
                          dataKey="fecha"
                          tickFormatter={shortFecha}
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `${Math.round(v)}`}
                          width={52}
                        />
                        <Tooltip content={<MoneyTooltip symbol={monedaSimbolo} />} cursor={{ stroke: '#94a3b8', strokeOpacity: 0.3 }} />
                        <ReferenceLine
                          y={t?.metaPromedio ?? 0}
                          stroke="#f59e0b"
                          strokeDasharray="6 4"
                          ifOverflow="extendDomain"
                        />
                        <Line
                          type="monotone"
                          dataKey="ventas"
                          name="Ventas"
                          stroke="#0d6cf2"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, fill: '#0d6cf2' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardShell>

              {/* Categorías más vendidas */}
              <CardShell>
                <CardTitle title="Categorías más vendidas" subtitle="Ingresos por categoría · 30 días" />
                <div className="mt-4 flex-1 h-64">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : !categoriasBars.length ? (
                    <EmptyChart text="Sin datos de ventas por categoría" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoriasBars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                        <XAxis
                          dataKey="nombre"
                          tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `${Math.round(v)}`}
                          width={52}
                        />
                        <Tooltip content={<MoneyTooltip symbol={monedaSimbolo} />} cursor={{ fill: '#94a3b8', fillOpacity: 0.08 }} />
                        <Bar dataKey="ventas" name="Ingresos" radius={[4, 4, 0, 0]}>
                          {categoriasBars.map((b) => (
                            <Cell key={b.nombre} fill={b.ventas === maxBar ? '#0a56c2' : '#0d6cf2'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardShell>
            </div>
          </section>

          {/* ── CAPA 4 · Listas accionables ── */}
          <section aria-label="Listas de acción">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top quiebre de stock inminente (proyección) */}
              <CardShell>
                <CardTitle
                  title="Quiebre de stock inminente"
                  subtitle="Proyección por velocidad de venta (7 días)"
                  action={<Link href="/consultas/stock" className="text-sm text-primary hover:underline font-medium shrink-0">Ver stock</Link>}
                />
                <div className="mt-4 flex-1">
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : !data?.listas.quiebreStock.length ? (
                    <EmptyList text="Sin riesgo de quiebre proyectado" />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.listas.quiebreStock.map((m) => {
                        const critico = m.stock <= 0 || (m.diasRestantes != null && m.diasRestantes < 3)
                        const atencion = m.diasRestantes != null && m.diasRestantes < 5
                        return (
                          <div key={m.id} className="py-2.5 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.descripcion}</p>
                              <p className="text-xs text-slate-500">
                                {m.codigo} · {m.stock} {m.unidad} / mín. {m.minimo}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold',
                                critico
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : atencion
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-slate-500/10 text-slate-500'
                              )}
                            >
                              {fmtDias(m.diasRestantes, m.stock, m.minimo)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardShell>

              {/* Últimos movimientos de caja */}
              <CardShell>
                <CardTitle
                  title="Últimos movimientos de caja"
                  subtitle="Entradas / salidas recientes"
                  action={<Link href="/consultas/transacciones-caja" className="text-sm text-primary hover:underline font-medium shrink-0">Ver caja</Link>}
                />
                <div className="mt-2 flex-1">
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : !data?.listas.movimientosCaja.length ? (
                    <EmptyList text="Sin movimientos registrados" />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.listas.movimientosCaja.slice(0, 6).map((m) => (
                        <CajaMovimiento key={m.id} m={m} symbol={monedaSimbolo} />
                      ))}
                    </div>
                  )}
                </div>
              </CardShell>

              {/* Clientes con mayor deuda pendiente */}
              <CardShell>
                <CardTitle title="Clientes con mayor deuda" subtitle="Cuentas por cobrar" />
                <div className="mt-4 flex-1">
                  {loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : !data?.listas.clientesDeuda.length ? (
                    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center px-4">
                      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">account_balance</span>
                      <p className="text-sm font-medium text-slate-500">Sin deudas registradas</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Disponible cuando actives el módulo de cuentas por cobrar.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.listas.clientesDeuda.map((c) => (
                        <div key={c.id} className="py-2.5 flex items-center justify-between">
                          <span className="text-sm text-slate-900 dark:text-white truncate">{c.nombre}</span>
                          <Badge variant="error">deuda</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardShell>
            </div>
          </section>

          {/* Marcas visuales de semántica de color */}
          <p className="text-[10px] text-slate-400/70 -mt-1">
            Rojo = crítico · Naranja/Ámbar = atención · Azul = información · Verde = en orden
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">monitoring</span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}

function EmptyList({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-700 mb-2">check_circle_outline</span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}