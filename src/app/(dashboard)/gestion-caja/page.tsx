'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import CajaApertura from '@/components/gestion-caja/CajaApertura'
import CajaDashboard from '@/components/gestion-caja/CajaDashboard'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'

export default function GestionCajaPage() {
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const checkActiveSession = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/gestion-caja/sesion/activa')
      const data = await res.json()
      setActiveSession(data)
    } catch (error) {
      console.error('Error checking active session:', error)
      toast.error('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkActiveSession()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        <Topbar title="Gestión de Caja" />
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="size-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary animate-pulse">account_balance_wallet</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
      <Topbar title="Gestión de Caja" />
      <div className="flex-1 overflow-y-auto p-6 pt-2">
        <div className="max-w-7xl mx-auto space-y-6">
          {!activeSession ? (
            <CajaApertura onOpened={checkActiveSession} />
          ) : (
            <CajaDashboard session={activeSession} onClosed={checkActiveSession} />
          )}
        </div>
      </div>
    </div>
  )
}
