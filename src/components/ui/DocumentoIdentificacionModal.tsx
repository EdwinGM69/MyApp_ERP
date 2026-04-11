'use client'

import React, { useState, useEffect } from 'react'
import CrudModal from './CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface DocumentoIdentificacionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (documento: any) => void
  initialDescription?: string
}

export default function DocumentoIdentificacionModal({ open, onClose, onSuccess, initialDescription = '' }: DocumentoIdentificacionModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    abreviatura: '',
    descripcion: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        abreviatura: initialDescription.substring(0, 5).toUpperCase(),
        descripcion: initialDescription,
      })
    }
  }, [open, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await apiFetch('/api/logistica/documentos-identificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          activo: true
        })
      })

      let data: any
      try {
        data = await res.json()
      } catch (e) {
        console.error('[DocumentoIdentificacionModal] JSON parse error:', e)
        if (!res.ok) throw new Error(`Error del servidor (${res.status}): ${res.statusText}`)
        throw new Error('La respuesta del servidor no es un JSON válido')
      }

      if (!res.ok) {
        console.error('[DocumentoIdentificacionModal] Error data:', data)
        let errorMessage = 'Error al crear el tipo de documento'
        if (typeof data.error === 'string') {
          errorMessage = data.error
        } else if (Array.isArray(data.error)) {
          errorMessage = data.error.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        } else if (data.message) {
          errorMessage = data.message
        }
        throw new Error(errorMessage)
      }

      toast.success(`Tipo de documento "${data.descripcion}" creado`)
      console.log('[DocumentoIdentificacionModal] Success data:', data)
      onSuccess(data)
      onClose()
    } catch (error: any) {
      console.error('[DocumentoIdentificacionModal] Catch block error:', error)
      const errorMsg = error.message || String(error)
      toast.error(`Error: ${errorMsg}. Ver consola para detalles.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="Nuevo Tipo de Documento"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Abreviatura</label>
          <input
            type="text"
            required
            maxLength={10}
            value={form.abreviatura}
            onChange={(e) => setForm({ ...form, abreviatura: e.target.value.toUpperCase() })}
            placeholder="Ej: NIT, RUC, DNI"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción Completa</label>
          <input
            type="text"
            required
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Nombre completo del documento"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all sm:text-[10px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 sm:text-[10px]"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Guardar Documento
              </>
            )}
          </button>
        </div>
      </form>
    </CrudModal>
  )
}
