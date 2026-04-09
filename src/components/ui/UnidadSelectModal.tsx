'use client'

import React, { useState, useEffect } from 'react'
import CrudModal from './CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface UnidadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (unidad: any) => void
  initialDescription?: string
}

export default function UnidadModal({ open, onClose, onSuccess, initialDescription = '' }: UnidadModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    descripcion: '',
    abreviatura: '',
    unidad_multiplo: 1,
    activo: true
  })

  useEffect(() => {
    if (open) {
      setForm({
        descripcion: initialDescription,
        abreviatura: initialDescription.substring(0, 3).toUpperCase(),
        unidad_multiplo: 1,
        activo: true
      })
    }
  }, [open, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiFetch('/api/logistica/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear la unidad de medida')
      }

      const newUnidad = await res.json()
      toast.success(`Unidad "${newUnidad.descripcion}" creada correctamente`)
      onSuccess(newUnidad)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo crear la unidad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="Crear Nueva Unidad de Medida"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
          <input
            type="text"
            required
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Ej: UNIDAD, KILOGRAMOS, LITROS"
            className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Abreviatura</label>
          <input
            type="text"
            required
            value={form.abreviatura}
            onChange={(e) => setForm({ ...form, abreviatura: e.target.value.toUpperCase() })}
            placeholder="Ej: UND, KG, LTS"
            className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unidad Múltiplo</label>
          <input
            type="number"
            required
            min="1"
            value={form.unidad_multiplo}
            onChange={(e) => setForm({ ...form, unidad_multiplo: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Guardar Unidad
              </>
            )}
          </button>
        </div>
      </form>
    </CrudModal>
  )
}
