'use client'

import { useAuthStore, apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'

interface PlanPrecioData {
  id: number
  precio: string | number
  moneda: string
  mejor_valor: boolean
  mensaje_promocion: string | null
}

interface PlanCaracteristicaData {
  id: number
  descripcion: string
}

interface PlanModalPlan {
  id: number
  descripcion: string
  tipo_plan: string
  dias_duracion: number
  precios: PlanPrecioData[]
  caracteristicas: PlanCaracteristicaData[]
}

interface PlanUpgradeModalProps {
  open: boolean
  onClose: () => void
}

const monedaSymbols: Record<string, string> = {
  '1': 'S/',
  '2': '$',
}

const METODOS_PAGO = [
  {
    id: 'tarjeta',
    label: 'Tarjeta de crédito / débito',
    icon: 'credit_card',
    desc: 'Pago con tarjeta (simulado)',
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    icon: 'account_balance',
    desc: 'Depósito o transferencia a cuenta',
  },
  {
    id: 'efectivo',
    label: 'Efectivo / Pago directo',
    icon: 'payments',
    desc: 'Pago presencial o en efectivo',
  },
] as const

function formatPrice(precio: string | number): string {
  const num = Number(precio)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function getPreferredPrecio(plan: PlanModalPlan): PlanPrecioData | null {
  if (plan.precios.length === 0) return null
  return plan.precios.find((p) => p.mejor_valor) ?? plan.precios[0]
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PlanUpgradeModal({ open, onClose }: PlanUpgradeModalProps) {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<PlanModalPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [metodoPago, setMetodoPago] = useState<string | null>(null)
  const [referencia, setReferencia] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  )
  const selectedPrecio = selectedPlan ? getPreferredPrecio(selectedPlan) : null

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/planes')
      if (!res.ok) {
        toast.error('No se pudieron cargar los planes')
        return
      }
      const json = await res.json()
      const lista: PlanModalPlan[] = (json.data ?? []).filter(
        (p: PlanModalPlan) => (p.precios?.length ?? 0) > 0
      )
      setPlans(lista)
      const firstId = lista[0]?.id ?? null
      setSelectedPlanId(firstId)
    } catch {
      toast.error('Error al cargar los planes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setPlans([])
    setSelectedPlanId(null)
    setMetodoPago(null)
    setReferencia('')
    loadPlans()
  }, [open, loadPlans])

  async function refreshSubscription() {
    try {
      const res = await apiFetch('/api/auth/subscription-status')
      if (!res.ok) return
      const { subscription } = await res.json()
      if (subscription && user) {
        setAuth('', { ...user, subscriptionAlert: subscription } as any)
      }
    } catch {
      // Silencioso — el siguiente polling de SubscriptionGuard actualizará el estado
    }
  }

  async function handleConfirmar() {
    if (!selectedPlan || !selectedPrecio || !metodoPago) return

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/planes/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planPrecioId: selectedPrecio.id,
          metodoPago,
          referencia: referencia.trim() || null,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(json?.error ?? 'Error al actualizar el plan')
        return
      }

      toast.success(`Plan actualizado a ${selectedPlan.descripcion}`)
      await refreshSubscription()
      onClose()
    } catch {
      toast.error('Error al actualizar el plan')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const planActual = user?.subscriptionAlert?.planName ?? null
  const fechaFin = user?.subscriptionAlert?.fechaFin ?? null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2rem]',
          'shadow-2xl shadow-black/20 border border-slate-100 dark:border-slate-800',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          'animate-in fade-in zoom-in-95 duration-200 ease-out'
        )}
      >
        {/* Encabezado */}
        <div className="px-7 pt-6 pb-0 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px] text-emerald-600 dark:text-emerald-400">
                upgrade
              </span>
            </div>
            <div>
              <h3 className="text-xl font-black text-blue-950 dark:text-white tracking-tight">
                Actualizar plan
              </h3>
              <p className="text-xs text-blue-900/60 dark:text-slate-400 font-medium">
                {planActual ? (
                  <>
                    Plan actual: <strong>{planActual}</strong> · vence {formatFecha(fechaFin)}
                  </>
                ) : (
                  'Elige el plan que mejor se adapte a tu negocio'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-blue-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[22px] font-light">close</span>
          </button>
        </div>

        <div className="px-7 pb-7 pt-5 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 text-sm py-10">
              No hay planes disponibles en este momento.
            </div>
          ) : (
            <>
              {/* Selección de plan */}
              <section>
                <label className="block text-[11px] font-bold text-blue-900/70 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Selecciona tu plan
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => {
                    const precio = getPreferredPrecio(plan)
                    const symbol = monedaSymbols[precio?.moneda ?? ''] ?? '$'
                    const isSelected = selectedPlanId === plan.id

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn(
                          'relative text-left rounded-2xl border p-5 transition-all duration-200',
                          isSelected
                            ? 'border-emerald-500/70 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
                        )}
                      >
                        {precio?.mejor_valor && (
                          <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                            Mejor valor
                          </span>
                        )}

                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h4 className="font-bold text-blue-950 dark:text-white text-base">
                            {plan.descripcion}
                          </h4>
                          <span
                            className={cn(
                              'size-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-slate-300 dark:border-slate-600'
                            )}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[13px] text-white font-bold">
                                check
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-extrabold text-blue-950 dark:text-white">
                            {symbol}
                            {precio ? formatPrice(precio.precio) : '0'}
                          </span>
                          <span className="text-xs text-blue-900/60 dark:text-slate-400">
                            / {plan.dias_duracion} días
                          </span>
                        </div>

                        {precio?.mensaje_promocion && (
                          <span className="inline-block mb-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                            {precio.mensaje_promocion}
                          </span>
                        )}

                        <ul className="space-y-1.5 mt-2">
                          {plan.caracteristicas.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start gap-1.5 text-xs text-blue-900/70 dark:text-slate-300"
                            >
                              <span className="material-symbols-outlined text-sm text-emerald-500 mt-0.5 shrink-0">
                                check_circle
                              </span>
                              {c.descripcion}
                            </li>
                          ))}
                        </ul>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Forma de pago (simulada) */}
              <section>
                <label className="block text-[11px] font-bold text-blue-900/70 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Forma de pago
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {METODOS_PAGO.map((metodo) => {
                    const isSelected = metodoPago === metodo.id
                    return (
                      <button
                        key={metodo.id}
                        type="button"
                        onClick={() => setMetodoPago(metodo.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-200',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
                        )}
                      >
                        <span
                          className={cn(
                            'size-9 rounded-lg flex items-center justify-center shrink-0',
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          )}
                        >
                          <span className="material-symbols-outlined text-lg">{metodo.icon}</span>
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm font-bold leading-tight',
                              isSelected
                                ? 'text-primary dark:text-primary'
                                : 'text-blue-950 dark:text-white'
                            )}
                          >
                            {metodo.label}
                          </p>
                          <p className="text-[11px] text-blue-900/60 dark:text-slate-400 leading-tight mt-0.5">
                            {metodo.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-lg text-amber-500 shrink-0">
                    info
                  </span>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    <strong>Modo desarrollo:</strong> el pago es simulado y no se procesará ningún
                    cobro real. El nuevo plan se activa de inmediato.
                  </p>
                </div>

                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Nº de operación / referencia (opcional)"
                  maxLength={160}
                  className="mt-3 w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-blue-950 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              </section>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-2xl text-sm font-bold text-blue-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={submitting || !selectedPlanId || !metodoPago}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">verified</span>
                      Confirmar y actualizar plan
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}