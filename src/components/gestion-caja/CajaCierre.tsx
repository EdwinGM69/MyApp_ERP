'use client'

import React, { useState } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'
import CajaDenominacionGrid from './CajaDenominacionGrid'

interface Props {
  session: any
  onClose: () => void
  onSuccess: () => void
}

export default function CajaCierre({ session, onClose, onSuccess }: Props) {
  const permisos = usePermisos()
  const [denominaciones, setDenominaciones] = useState<any[]>([])
  const [montoCierre, setMontoCierre] = useState(0)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(session.caja?.detalle_denominacion ? 1 : 2)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/gestion-caja/sesion/cerrar', {
        method: 'POST',
        body: JSON.stringify({
          session_id: session.id,
          monto_cierre: montoCierre,
          denominaciones: denominaciones
        })
      })

      if (res.ok) {
        toast.success('Caja cerrada con éxito')
        onSuccess()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al cerrar caja')
      }
    } catch (error) {
       toast.error('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const diferencia = montoCierre - Number(session.saldoActual)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/60 transition-all duration-500 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-50/50 dark:bg-slate-950/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
           <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Cierre de Caja</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.caja?.descripcion} / {session.moneda?.descripcion}</p>
           </div>
           <button onClick={onClose} className="size-10 rounded-full hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all">
              <span className="material-symbols-outlined text-slate-400">close</span>
           </button>
        </div>

        <div className="p-8 space-y-8">
          
          {step === 1 ? (
            <div className="space-y-6">
               <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Conteo de Efectivo</p>
                  <h4 className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                    {montoCierre.toFixed(2)} <span className="text-sm">{session.moneda?.abreviatura}</span>
                  </h4>
               </div>
               
               <div className="max-h-[40vh] overflow-y-auto px-1 custom-scrollbar">
                  <CajaDenominacionGrid 
                    monedaId={session.moneda_id} 
                    onChange={(list, total) => {
                      setDenominaciones(list)
                      setMontoCierre(total)
                    }}
                  />
               </div>

               <div className="pt-4">
                  <button 
                  onClick={() => setStep(2)}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                  >
                    Siguiente: Resumen de Cierre
                  </button>
               </div>
            </div>
          ) : (
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Esperado</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                      {Number(session.saldoActual).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-primary/30 shadow-lg shadow-primary/5 transition-all focus-within:border-primary">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Contado</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-primary opacity-50">{session.moneda?.simbolo}</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={montoCierre || ''}
                        onChange={(e) => setMontoCierre(Number(e.target.value))}
                        className="w-full bg-transparent text-2xl font-black text-primary tabular-nums tracking-tighter outline-none p-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                        autoFocus={!session.caja?.detalle_denominacion}
                      />
                    </div>
                  </div>
               </div>

               <div className={cn(
                  "p-6 rounded-[2rem] border flex items-center justify-between",
                  diferencia === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : 
                  diferencia > 0 ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-red-50 border-red-100 text-red-600"
               )}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">
                      {diferencia === 0 ? 'check_circle' : diferencia > 0 ? 'add_circle' : 'remove_circle'}
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Diferencia / Arqueo</p>
                  </div>
                  <p className="text-2xl font-black tabular-nums tracking-tighter">
                    {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                  </p>
               </div>

               <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start">
                  <span className="material-symbols-outlined text-amber-500 text-xl">warning</span>
                  <p className="text-[11px] font-medium text-amber-700 leading-tight">
                    Al confirmar el cierre, la sesión será finalizada y no se podrán registrar más movimientos. Asegúrate de que el arqueo es correcto.
                  </p>
               </div>

               <div className="flex gap-3">
                  <button 
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    Volver
                  </button>
                  {permisos.editar && (
                  <button 
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                  >
                    {loading ? 'Cerrando...' : 'Confirmar y Cerrar Caja'}
                  </button>
                  )}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
