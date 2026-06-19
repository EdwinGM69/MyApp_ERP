'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Switch from '@/components/ui/Switch'
import { cn } from '@/lib/utils'

interface EstadoStock {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
}

interface EstadoStockFormProps {
  estadoStockToEdit?: EstadoStock
}

export default function EstadoStockForm({ estadoStockToEdit }: EstadoStockFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Form State
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    if (estadoStockToEdit) {
      setCodigo(estadoStockToEdit.codigo)
      setDescripcion(estadoStockToEdit.descripcion)
      setActivo(estadoStockToEdit.activo)
    }
  }, [estadoStockToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: estadoStockToEdit?.id,
      codigo: codigo.trim(),
      descripcion: descripcion.trim(),
      activo,
    }

    try {
      const res = await apiFetch('/api/logistica/estados-stock', {
        method: estadoStockToEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(estadoStockToEdit ? 'Estado de stock actualizado' : 'Estado de stock creado')
      router.push('/maestros/estados-stock')
      router.refresh()
    } catch (error: any) {
      const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
      toast.error(msg || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 px-8 flex items-center justify-between shadow-sm tracking-tight transition-all">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/maestros/estados-stock')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Maestros</span>
              <span className="text-[8px]">/</span>
              <span>Estados de Stock</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {estadoStockToEdit ? 'Editar Estado de Stock' : 'Registro de Estado de Stock'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Defina los estados para clasificar el inventario de sus materiales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="estado-stock-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Estado
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-8 py-6">
        <form id="estado-stock-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Código del Estado</label>
                  <input
                    required value={codigo} onChange={e => setCodigo(e.target.value)}
                    type="text"
                    disabled={!!estadoStockToEdit}
                    className={cn(
                      "w-full px-6 py-4 border rounded-2xl text-base font-medium outline-none transition-all placeholder:text-slate-400",
                      estadoStockToEdit
                        ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    )}
                    placeholder="Ej: DISPONIBLE, DANADO, RESERVADO, CALIDAD"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Descripción</label>
                  <textarea
                    required value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
                    placeholder="Ingrese detalles sobre este estado de stock..."
                  />
                </div>
              </div>
            </div>

            {/* Information Card */}
            <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">Control de Estados</h4>
                <p className="text-xs text-slate-500 font-medium">Los estados de stock permiten controlar la disponibilidad de los materiales en los movimientos de almacén.</p>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Estado del Registro</label>
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

            {/* Audit Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Auditoría</label>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                    <span className="material-symbols-outlined text-slate-400">person</span>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Creado por</label>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {estadoStockToEdit?.usuario_creador?.nombre || '--'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {estadoStockToEdit?.created_at ? format(new Date(estadoStockToEdit.created_at), 'dd MMM, hh:mm aa') : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100/50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-300">history</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Última modificación</label>
                    {estadoStockToEdit?.usuario_modificador?.nombre ? (
                      <>
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{estadoStockToEdit.usuario_modificador.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {estadoStockToEdit.updated_at ? format(new Date(estadoStockToEdit.updated_at), 'dd MMM, hh:mm aa') : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-slate-400 italic">Sin cambios registrados</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tip Card */}
            <div className="bg-[#0f172a] rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20 group hover:scale-[1.02] transition-all cursor-default overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all rotate-12">
                <span className="material-symbols-outlined text-[100px]">lightbulb</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-blue-400 text-[20px]">lightbulb</span>
                  <h4 className="text-xs font-black uppercase tracking-wider">Tip Pro</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Defina estados claros para diferenciar materiales disponibles para venta, materiales en cuarentena o materiales dañados.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
