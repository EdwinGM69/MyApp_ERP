'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface PaisModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (pais: any) => void
  initialDescription?: string
}

export default function PaisModal({ open, onClose, onSuccess, initialDescription = '' }: PaisModalProps) {
  const [descripcion, setDescripcion] = useState('')
  const [abreviatura, setAbreviatura] = useState('')
  const [prefijo, setPrefijo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDescripcion(initialDescription)
      setAbreviatura('')
      setPrefijo('')
    }
  }, [open, initialDescription])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await apiFetch('/api/logistica/paises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion, abreviatura, prefijo_telefonico: prefijo, activo: true })
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al crear país')
      }

      const newPais = await res.json()
      toast.success('País creado correctamente')
      onSuccess(newPais)
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Nuevo País</h3>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Registro rápido de país</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Descripción / Nombre</label>
            <input
              autoFocus
              required
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="Ej: Perú"
              className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Abreviatura (ISO)</label>
              <input
                required
                type="text"
                value={abreviatura}
                onChange={(e) => setAbreviatura(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="PE"
                className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Prefijo Tel.</label>
              <input
                type="text"
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="+51"
                className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !descripcion || !abreviatura}
              className="flex-[2] px-6 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Crear País
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
