'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import SucursalSelect from '@/components/ui/SucursalSelect'
import CajaSelect from '@/components/ui/CajaSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import CajaDenominacionGrid from './CajaDenominacionGrid'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useSucursal } from '@/contexts/SucursalContext'

interface Props {
  onOpened: () => void
}

export default function CajaApertura({ onOpened }: Props) {
  const { currentSucursal } = useSucursal()
  const [formData, setFormData] = useState({
    sucursal_id: currentSucursal?.id || 0,
    sucursal_label: currentSucursal?.descripcion || '',
    caja_id: 0,
    caja_label: '',
    moneda_id: 0,
    moneda_label: '',
    moneda_simbolo: '$',
    monto_apertura: 0,
  })
  
  // Reset form when sucursal changes
  useEffect(() => {
    setFormData({
      sucursal_id: currentSucursal?.id || 0,
      sucursal_label: currentSucursal?.descripcion || '',
      caja_id: 0,
      caja_label: '',
      moneda_id: 0,
      moneda_label: '',
      moneda_simbolo: '$',
      monto_apertura: 0,
    })
  }, [currentSucursal])
  const [denominaciones, setDenominaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDenominaciones, setShowDenominaciones] = useState(false)

  // Fetch company default currency on mount
  React.useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await apiFetch('/api/empresa')
        if (res.ok) {
          const company = await res.json()
          if (company.moneda_id) {
            setFormData(p => ({ 
              ...p, 
              moneda_id: company.moneda_id, 
              moneda_label: company.moneda_default_label || '', // Adjust if label is returned in the API
              moneda_simbolo: company.moneda_simbolo || '$'
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error)
      }
    }
    fetchCompanyInfo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sucursal_id || !formData.caja_id || !formData.moneda_id) {
      toast.error('Complete todos los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/api/gestion-caja/sesion/abrir', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          denominaciones: showDenominaciones ? denominaciones : []
        })
      })

      if (res.ok) {
        toast.success('Sesión de caja abierta correctamente')
        onOpened()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al abrir caja')
      }
    } catch (error) {
      console.error('Error opening session:', error)
      toast.error('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] py-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary text-white mb-2 shadow-lg shadow-primary/20 transition-all">
            <span className="material-symbols-outlined text-2xl">lock_open</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-1">Apertura de Caja</h2>
          <p className="text-slate-400 font-medium max-w-sm mx-auto text-[10px] leading-relaxed uppercase tracking-widest">
            Configuración de punto de venta e ingreso de saldo inicial.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1">Sucursal</label>
              <SucursalSelect 
                onSelect={(s) => setFormData(p => ({ ...p, sucursal_id: s.id, sucursal_label: s.descripcion }))}
                selectedLabel={formData.sucursal_label}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1">Caja Destino</label>
              <CajaSelect 
                sucursalId={formData.sucursal_id}
                onSelect={(c) => setFormData(p => ({ ...p, caja_id: c.id, caja_label: c.descripcion }))}
                selectedLabel={formData.caja_label}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1">Moneda</label>
              <MonedaSelect 
                value={formData.moneda_id || undefined}
                onChange={(m: any) => setFormData(p => ({ 
                  ...p, 
                  moneda_id: m?.id || 0, 
                  moneda_label: m?.descripcion || '',
                  moneda_simbolo: m?.simbolo || '$'
                }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 px-1">Saldo Inicial</label>
              <div className="relative group">
                <span className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 font-bold group-focus-within:text-primary transition-colors text-sm",
                  formData.moneda_simbolo && "text-primary dark:text-primary/70"
                )}>
                  {formData.moneda_simbolo}
                </span>
                <input 
                  type="number"
                  step="0.01"
                  value={formData.monto_apertura || ''}
                  onChange={(e) => setFormData(p => ({ ...p, monto_apertura: parseFloat(e.target.value) || 0 }))}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 placeholder:font-medium"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Toggle Denominations */}
          <div className="pt-0">
             <button 
              type="button"
              onClick={() => setShowDenominaciones(!showDenominaciones)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                showDenominaciones ? "bg-primary/5 border-primary/20 text-primary" : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400 hover:border-slate-200"
              )}
             >
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-xl">{showDenominaciones ? 'visibility' : 'visibility_off'}</span>
                 <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Desglose de Efectivo</p>
                    <p className="text-[8px] font-medium opacity-50 uppercase tracking-tighter">Opcional</p>
                 </div>
               </div>
               <span className={cn("material-symbols-outlined text-lg transition-transform", showDenominaciones ? 'rotate-180' : '')}>expand_more</span>
             </button>

             {showDenominaciones && formData.moneda_id > 0 && (
               <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                 <CajaDenominacionGrid 
                    monedaId={formData.moneda_id} 
                    onChange={(list, total) => {
                      setDenominaciones(list)
                      // Optional: Sync total with monto_apertura or just use it as validation
                      setFormData(p => ({ ...p, monto_apertura: total }))
                    }}
                 />
               </div>
             )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:grayscale overflow-hidden group relative"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                Confirmar Apertura
                <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">double_arrow</span>
              </>
            )}
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
          </button>
        </form>
      </div>
    </div>
  )
}
