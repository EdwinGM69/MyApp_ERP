'use client'

import React, { useState, useEffect } from 'react'
import CrudModal from './CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MarcaSelect from './MarcaSelect'
import CategoriaSelect from './CategoriaSelect'
import UnidadSelect from './UnidadSelect'

interface MaterialModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (material: any) => void
  initialDescription?: string
}

export default function MaterialModal({ open, onClose, onSuccess, initialDescription = '' }: MaterialModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria_id: undefined as number | undefined,
    marca_id: undefined as number | undefined,
    unidad_medida_id: undefined as number | undefined,
    precio_costo: 0,
    precio_venta: 0,
    activo: true
  })

  useEffect(() => {
    if (open) {
      const generatedCode = initialDescription
        ? initialDescription.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000)
        : 'MAT-' + Math.floor(1000 + Math.random() * 9000)
        
      setForm({
        codigo: generatedCode,
        descripcion: initialDescription,
        categoria_id: undefined,
        marca_id: undefined,
        unidad_medida_id: undefined,
        precio_costo: 0,
        precio_venta: 0,
        activo: true
      })
    }
  }, [open, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiFetch('/api/materiales', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear el material')
      }

      const newMaterial = await res.json()
      toast.success(`Material "${newMaterial.descripcion}" creado correctamente`)
      onSuccess(newMaterial)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo crear el material')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Material"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código</label>
            <input
              type="text"
              required
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
            <input
              type="text"
              required
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Nombre del material..."
              className="w-full px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
            <CategoriaSelect
              value={form.categoria_id}
              onChange={(id) => setForm({ ...form, categoria_id: id })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marca</label>
            <MarcaSelect
              value={form.marca_id}
              onChange={(id) => setForm({ ...form, marca_id: id })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unidad</label>
            <UnidadSelect
              value={form.unidad_medida_id}
              onChange={(id) => setForm({ ...form, unidad_medida_id: id })}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 col-span-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Precio Costo</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Precio Venta</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
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
            className="flex-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Guardar Material
              </>
            )}
          </button>
        </div>
      </form>
    </CrudModal>
  )
}
