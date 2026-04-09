'use client'

import React, { useState, useEffect } from 'react'
import CrudModal from './CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface TipoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (tipo: any) => void
  initialDescription?: string
}

export default function TipoModal({ open, onClose, onSuccess, initialDescription = '' }: TipoModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
  })

  // Pre-fill description and generate code ONLY when the modal opens
  useEffect(() => {
    if (open) {
      const generatedCode = initialDescription
        ? initialDescription.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000)
        : ''
        
      setForm({
        codigo: generatedCode,
        descripcion: initialDescription,
      })
    }
  }, [open, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await apiFetch('/api/materiales/tipos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          activo: true
        })
      })

      const contentType = res.headers.get('content-type')
      
      if (!res.ok) {
        if (contentType?.includes('text/html')) {
          throw new Error('Sesión expirada. Por favor, vuelva a iniciar sesión.')
        }
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear el tipo de material')
      }

      const newTipo = await res.json()
      
      if (!newTipo || !newTipo.id) {
        throw new Error('La respuesta del servidor no contiene los datos del tipo de material creado.')
      }

      toast.success(`Tipo "${newTipo.descripcion}" creado correctamente`)
      onSuccess(newTipo)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo crear el tipo de material')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Tipo de Material"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código</label>
          <input
            type="text"
            required
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            placeholder="Ej: TIPO-001"
            className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción / Nombre</label>
          <input
            type="text"
            required
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Nombre del tipo de material"
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
                Guardar Tipo
              </>
            )}
          </button>
        </div>
      </form>
    </CrudModal>
  )
}
