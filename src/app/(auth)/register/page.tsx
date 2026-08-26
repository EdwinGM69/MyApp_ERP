'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PlanId = 'free' | 'monthly' | 'annual'

interface PlanFeature {
  text: string
}

interface Plan {
  id: PlanId
  name: string
  subtitle: string
  price: string
  period: string
  badge?: string
  savings?: string
  features: PlanFeature[]
  buttonText: string
  recommended?: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    subtitle: '(Prueba)',
    price: '$0',
    period: '/ 14 días',
    features: [
      { text: 'Acceso básico' },
      { text: '1 sucursal' },
      { text: 'Hasta 50 productos' },
    ],
    buttonText: 'Comenzar prueba gratuita',
  },
  {
    id: 'monthly',
    name: 'Plan Mensual',
    subtitle: '',
    price: '$29',
    period: '/ mes',
    features: [
      { text: 'Todo en el plan gratuito' },
      { text: 'Sucursales ilimitadas' },
      { text: 'Reportes avanzados' },
      { text: 'Soporte prioritario' },
    ],
    buttonText: 'Seleccionar Mensual',
  },
  {
    id: 'annual',
    name: 'Plan Anual',
    subtitle: 'Recomendado',
    price: '$290',
    period: '/ año',
    badge: 'MEJOR VALOR',
    savings: 'Ahorra 2 meses',
    recommended: true,
    features: [
      { text: 'Todo en el plan mensual' },
      { text: 'Capacitación personalizada' },
      { text: 'API access' },
      { text: 'Consultoría trimestral' },
    ],
    buttonText: 'Seleccionar Anual',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [hoveredPlan, setHoveredPlan] = useState<PlanId | null>(null)

  function handleSelectPlan(planId: PlanId) {
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
        {plans.map((plan) => {
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
                {plan.subtitle && (
                  <p className={`text-xs mt-0.5 ${isRecommended ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    {plan.subtitle}
                  </p>
                )}
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
                      {feature.text}
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
                    : plan.id === 'monthly'
                      ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25'
                      : 'bg-slate-700 text-white border border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                  }
                `}
              >
                <span className="material-symbols-outlined text-lg">
                  {plan.id === 'free' ? 'rocket_launch' : 'check_circle'}
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
