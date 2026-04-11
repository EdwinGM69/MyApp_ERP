'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Denominacion {
  id: number
  valor: number
  tipo: string
  secuencia: number
}

interface DenominacionInput {
  denominacion_id: number
  valor: number
  cantidad: number
  subtotal: number
}

interface Props {
  monedaId: number
  onChange: (denominaciones: DenominacionInput[], total: number) => void
  disabled?: boolean
}

export default function CajaDenominacionGrid({ monedaId, onChange, disabled }: Props) {
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([])
  const [inputs, setInputs] = useState<{ [key: number]: number }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchDenominaciones() {
      if (!monedaId) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/tesoreria/monedas/denominaciones?monedaId=${monedaId}`)
        const data = await res.json()
        setDenominaciones(data)
        // Reset inputs
        setInputs({})
      } catch (err) {
        console.error('Error fetching denominations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDenominaciones()
  }, [monedaId])

  useEffect(() => {
    const results: DenominacionInput[] = denominaciones.map(d => ({
      denominacion_id: d.id,
      valor: Number(d.valor),
      cantidad: inputs[d.id] || 0,
      subtotal: (inputs[d.id] || 0) * Number(d.valor)
    }))
    const total = results.reduce((acc, curr) => acc + curr.subtotal, 0)
    onChange(results, total)
  }, [inputs, denominaciones])

  const handleInputChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0
    setInputs(prev => ({ ...prev, [id]: numValue }))
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando Denominaciones...</div>

  if (denominaciones.length === 0) return (
    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
      <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">payments</span>
      <p className="text-xs text-slate-400 font-medium italic">No hay denominaciones configuradas para esta moneda.</p>
    </div>
  )

  const billetes = denominaciones.filter(d => d.tipo === 'Billete')
  const monedas = denominaciones.filter(d => d.tipo === 'Moneda')

  const renderSection = (title: string, items: Denominacion[]) => (
    <div className="space-y-4">
      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 flex items-center gap-2">
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></span>
        {title}
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(d => (
          <div key={d.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none">
            <div className="size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-400 text-xs tracking-tighter">
              {Number(d.valor)}
            </div>
            <div className="flex-1 min-w-0">
               <input
                disabled={disabled}
                type="number"
                min="0"
                value={inputs[d.id] || ''}
                placeholder="Cantidad"
                onChange={(e) => handleInputChange(d.id, e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
               />
               <div className="text-[10px] text-slate-400 font-medium">
                 Subtotal: <span className="text-primary font-bold">{(inputs[d.id] || 0) * Number(d.valor)}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 p-1">
      {billetes.length > 0 && renderSection('Billetes', billetes)}
      {monedas.length > 0 && renderSection('Monedas', monedas)}
    </div>
  )
}
