'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Switch from '@/components/ui/Switch'
import { cn } from '@/lib/utils'

interface Unidad {
  id: number
  descripcion: string
  abreviatura: string
  unidad_multiplo: number
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
}

interface UnidadFormProps {
  unidadToEdit?: Unidad
}

export default function UnidadForm({ unidadToEdit }: UnidadFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Form State
  const [descripcion, setDescripcion] = useState('')
  const [abreviatura, setAbreviatura] = useState('')
  const [unidadMultiplo, setUnidadMultiplo] = useState(1)
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    if (unidadToEdit) {
      setDescripcion(unidadToEdit.descripcion)
      setAbreviatura(unidadToEdit.abreviatura)
      setUnidadMultiplo(unidadToEdit.unidad_multiplo)
      setActivo(unidadToEdit.activo)
    }
  }, [unidadToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: unidadToEdit?.id,
      descripcion: descripcion.trim(),
      abreviatura: abreviatura.trim(),
      unidad_multiplo: unitMultiplo,
      activo,
    }

    try {
      const res = await apiFetch('/api/logistica/unidades', {
        method: unidadToEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(unidadToEdit ? 'Unidad de medida actualizada' : 'Unidad de medida creada')
      router.push('/maestros/logistica/unidades')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Helper for payload since I made a typo in the local variable name in the handler
  const unitMultiplo = Number(unidadMultiplo)

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 px-8 flex items-center justify-between shadow-sm tracking-tight transition-all">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/maestros/logistica/unidades')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Maestros</span>
              <span className="text-[8px]">/</span>
              <span>Unidades de Medida</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {unidadToEdit ? 'Editar Unidad' : 'Nueva Unidad de Medida'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="unidad-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-8 py-6">
        <form id="unidad-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Abreviatura</label>
                  <input
                    type="text" required value={abreviatura} onChange={e => setAbreviatura(e.target.value.toUpperCase())}
                    className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono placeholder:text-slate-400"
                    placeholder="Ej: UND, KG, LT"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Unidad Múltiplo</label>
                  <input
                    type="number" required value={unidadMultiplo} onChange={e => setUnidadMultiplo(Number(e.target.value))}
                    className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Descripción</label>
                <textarea
                  required value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  rows={2}
                  className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
                  placeholder="Ej: Unidades, Kilogramos, Litros..."
                />
              </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">info</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">Unidad Múltiplo</h4>
                <p className="text-xs text-slate-500 font-medium">Define cuántas unidades básicas contiene esta unidad de medida (por defecto 1).</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Estado</label>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    activo ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", activo ? "text-slate-800 dark:text-white" : "text-slate-400")}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <Switch checked={activo} onChange={setActivo} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Auditoría</label>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400">person</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Creado por</label>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {unidadToEdit?.usuario_creador?.nombre || '--'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {unidadToEdit?.created_at ? format(new Date(unidadToEdit.created_at), 'dd MMM, hh:mm aa') : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100/50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-300">history</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Última modificación</label>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {unidadToEdit?.usuario_modificador?.nombre || '--'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {unidadToEdit?.updated_at ? format(new Date(unidadToEdit.updated_at), 'dd MMM, hh:mm aa') : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
