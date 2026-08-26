'use client'

import { useEffect, useState, useCallback, ReactNode } from 'react'
import { useAuthStore } from '@/hooks/useAuth'
import { apiFetch } from '@/hooks/useAuth'

interface SubscriptionAlert {
  nivelAlerta: string
  diasRestantes: number | null
  diasGraciaRestantes: number | null
  enPeriodoGracia: boolean
  vencida: boolean
  planName: string | null
  planType: string | null
  periodicity: string | null
  fechaFin: string | null
  subscriptionId: number | null
}

const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

function formatFecha(fecha: string | null): string {
  if (!fecha) return 'N/A'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function BlockedOverlay({ alert }: { alert: SubscriptionAlert }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-10 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[40px]">
            lock
          </span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Suscripción Vencida
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mb-6">
          {alert.planName && (
            <>Su plan <strong>{alert.planName}</strong> ha expirado.</>
          )}
          {alert.fechaFin && (
            <> La fecha de vencimiento fue el <strong>{formatFecha(alert.fechaFin)}</strong>.</>
          )}
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mb-8">
          Para continuar usando el sistema, comuníquese con su administrador o soporte técnico.
        </p>

        <button
          onClick={() => {
            document.cookie = 'access_token=; Max-Age=0; path=/'
            document.cookie = 'refresh_token=; Max-Age=0; path=/'
            localStorage.removeItem('auth_user')
            window.location.href = '/login'
          }}
          className="w-full px-6 py-3.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [currentAlert, setCurrentAlert] = useState<SubscriptionAlert | null>(
    user?.subscriptionAlert ?? null
  )

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/subscription-status')
      if (res.ok) {
        const { subscription } = await res.json()
        if (subscription) {
          setCurrentAlert(subscription)
          if (user) {
            setAuth('', { ...user, subscriptionAlert: subscription } as any)
          }
        }
      }
    } catch {
      // Silently ignore - will retry on next poll
    }
  }, [user, setAuth])

  useEffect(() => {
    if (user?.subscriptionAlert) {
      setCurrentAlert(user.subscriptionAlert)
    }
  }, [user?.subscriptionAlert])

  useEffect(() => {
    const interval = setInterval(fetchStatus, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (!currentAlert) return <>{children}</>

  if (currentAlert.vencida) {
    return <BlockedOverlay alert={currentAlert} />
  }

  return <>{children}</>
}
