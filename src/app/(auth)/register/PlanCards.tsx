'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PlanCard {
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

interface Props {
  plans: PlanCard[]
}

export default function PlanCards({ plans }: Props) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null)

  function handleSelectPlan(planId: number) {
    setSelectedPlan(planId)
    router.push(`/register/signup?plan=${planId}`)
  }

  return (
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
  )
}