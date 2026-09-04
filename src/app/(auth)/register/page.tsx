'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

interface PlanData {
  id: number
  descripcion: string
  tipo_plan: string
  dias_duracion: number
  precios: PlanPrecioData[]
  caracteristicas: PlanCaracteristicaData[]
}

interface PlanCard {
  id: number
  name: string
  price: string
  period: string
  badge?: string
  savings?: string
  features: string[]
  buttonText: string
  recommended: boolean
  trial: boolean
}

const monedaSymbols: Record<string, string> = {
  '1': 'S/',
  '2': '$',
}

function formatPrice(precio: string | number): string {
  const num = Number(precio)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function getPreferredPrecio(plan: PlanData): PlanPrecioData | null {
  if (plan.precios.length === 0) return null
  return (
    plan.precios.find((p) => p.mejor_valor) ||
    plan.precios[0]
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadPlans() {
      try {
        const res = await fetch('/api/planes')
        if (!res.ok) throw new Error('Error al cargar los planes')
        const data = await res.json()
        const list: PlanData[] = data?.data ?? []

        const cards: PlanCard[] = list.map((plan) => {
          const precio = getPreferredPrecio(plan)
          const symbol = monedaSymbols[precio?.moneda ?? ''] ?? '$'
          const dias = plan.dias_duracion

          return {
            id: plan.id,
            name: plan.descripcion,
            price: `${symbol}${precio ? formatPrice(precio.precio) : '0'}`,
            period: `/ ${dias} días`,
            badge: precio?.mejor_valor ? 'MEJOR VALOR' : undefined,
            savings: precio?.mensaje_promocion ?? undefined,
            features: plan.caracteristicas.map((c) => c.descripcion),
            buttonText: `Comenzar ${plan.tipo_plan}`,
            recommended: precio?.mejor_valor ?? false,
            trial: plan.tipo_plan === 'TRIAL',
          }
        })

        if (!cancelled) setPlans(cards)
      } catch {
        // Errors simply leave the grid empty; nothing else to render
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPlans()
    return () => {
      cancelled = true
    }
  }, [])

  function handleSelectPlan(planId: number) {
    setSelectedPlan(planId)
    // Navigate to signup form with selected plan
    router.push(`/register/signup?plan=${planId}`)
  }

  return (
    <div className="w-full max-w-none">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="bg-primary rounded-xl p-2.5 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-xl font-bold leading-none">KAMAQ ONE</h1>
          <p className="text-slate-400 text-xs mt-0.5">Sistema de Gestión</p>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl font-bold mb-2">
          Elige el plan ideal para tu negocio
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Comienza con nuestra prueba gratuita o elige un plan para desbloquear funciones avanzadas.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 bg-slate-800 border border-slate-700 animate-pulse h-72"
              />
            ))
          : plans.map((plan) => {
              const isHovered = hoveredPlan === plan.id
              const isRecommended = plan.recommended

              return (
                <div
                  key={plan.id}
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`
                    relative rounded-2xl p-6 transition-all duration-300 flex flex-col
                    ${isRecommended
                      ? 'bg-slate-950 border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-[1.03]'
                      : 'bg-slate-800 border border-slate-700 hover:border-slate-500'
                    }
                    ${isHovered && !isRecommended ? 'shadow-xl shadow-primary/10 -translate-y-1' : ''}
                    ${isHovered && isRecommended ? 'shadow-xl shadow-emerald-500/20 -translate-y-1' : ''}
                  `}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-emerald-500 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan Name */}
                  <div className="mb-4">
                    <h3 className={`font-bold text-lg ${isRecommended ? 'text-white' : 'text-white'}`}>
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-extrabold ${isRecommended ? 'text-white' : 'text-white'}`}>
                        {plan.price}
                      </span>
                      <span className="text-slate-400 text-sm">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {plan.savings}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className={`material-symbols-outlined text-base mt-0.5 flex-shrink-0 ${
                            isRecommended ? 'text-emerald-400' : 'text-primary'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span className={`text-sm ${isRecommended ? 'text-slate-200' : 'text-slate-300'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`
                      w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2
                      ${isRecommended
                        ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg'
                        : plan.trial
                          ? 'bg-slate-700 text-white border border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                          : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {plan.trial ? 'rocket_launch' : 'check_circle'}
                    </span>
                    {plan.buttonText}
                  </button>
                </div>
              )
            })}
      </div>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-blue-400 font-semibold transition-colors"
        >
          Iniciar Sesión
        </Link>
      </p>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}
