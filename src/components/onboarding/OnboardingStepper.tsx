'use client'

import { Fragment } from 'react'

interface OnboardingStepperProps {
  currentStep: 1 | 2
}

const steps = [
  { num: 1, label: 'Tu Empresa' },
  { num: 2, label: 'Tu Primera Sucursal' },
]

export default function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <div className="flex items-start justify-center mb-6 max-w-xs sm:max-w-sm mx-auto w-full">
      {steps.map((step, i) => {
        const isCompleted = step.num < currentStep
        const isActive = step.num === currentStep

        return (
          <Fragment key={step.num}>
            {/* Conector entre pasos */}
            {i > 0 && (
              <div
                className={`flex-1 h-0.5 mt-[15px] min-w-[24px] transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            )}

            {/* Círculo del paso */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 border-slate-600 text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                ) : (
                  step.num
                )}
              </div>
              <div className="text-center leading-tight">
                <p
                  className={`text-[10px] uppercase tracking-wider ${
                    isActive || isCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }`}
                >
                  Paso {step.num}
                </p>
                <p
                  className={`text-xs ${
                    isActive ? 'text-white font-semibold' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
