'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Switch from '@/components/ui/Switch'
import { cn } from '@/lib/utils'

interface Almacen {
  id: number
  descripcion: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
  almacenUbicaciones?: { Ubicacion: Ubicacion }[]
}

interface Ubicacion {
  id: number
  codigo: string
  descripcion: string
}

interface AlmacenFormProps {
  almacenToEdit?: Almacen
}

export default function AlmacenForm({ almacenToEdit }: AlmacenFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Form State
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)
  const [linkedUbicaciones, setLinkedUbicaciones] = useState<Ubicacion[]>([])
  const [availableUbicaciones, setAvailableUbicaciones] = useState<Ubicacion[]>([])
  const [showUbicacionSelector, setShowUbicacionSelector] = useState(false)
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (almacenToEdit) {
      setDescripcion(almacenToEdit.descripcion)
      setActivo(almacenToEdit.activo)
      if (almacenToEdit.almacenUbicaciones) {
        setLinkedUbicaciones(almacenToEdit.almacenUbicaciones.map(au => au.Ubicacion))
      }
    }
    setMounted(true)
  }, [almacenToEdit])

  const fetchAvailableUbicaciones = async () => {
    setLoadingAvailable(true)
    try {
      const res = await apiFetch('/api/logistica/ubicaciones')
      const json = await res.json()
      if (res.ok) {
        // Filter out already linked
        const linkedIds = new Set(linkedUbicaciones.map(u => u.id))
        setAvailableUbicaciones((json.data || []).filter((u: Ubicacion) => !linkedIds.has(u.id)))
      }
    } catch (error) {
      console.error('Error fetching available locations:', error)
    } finally {
      setLoadingAvailable(false)
    }
  }

  const handleAddUbicacion = (u: Ubicacion) => {
    setLinkedUbicaciones([...linkedUbicaciones, u])
    setAvailableUbicaciones(availableUbicaciones.filter(item => item.id !== u.id))
  }

  const handleRemoveUbicacion = (uId: number) => {
    setLinkedUbicaciones(linkedUbicaciones.filter(u => u.id !== uId))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)

    const payload = {
      id: almacenToEdit?.id,
      descripcion: descripcion.trim(),
      activo,
      ubicacion_ids: linkedUbicaciones.map(u => u.id)
    }

    try {
      const res = await apiFetch('/api/logistica/almacenes', {
        method: almacenToEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(almacenToEdit ? 'Almacén actualizado' : 'Almacén creado')
      router.push('/maestros/logistica/almacenes')
      router.refresh()
    } catch (error: any) {
      const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
      toast.error(msg || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-slate-50/50">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 py-4 px-8 flex items-center justify-between shadow-sm tracking-tight transition-all">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/maestros/logistica/almacenes')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Maestros</span>
              <span className="text-[8px]">/</span>
              <span>Gestión de Almacenes</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {almacenToEdit ? 'Editar Almacén' : 'Registro de Almacén'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Configure los puntos de almacenamiento para su inventario.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="almacen-form"
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Almacén
              </>
            )}
          </button>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto w-full px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/20 relative overflow-hidden flex flex-col h-full">
              {/* Top Progress Bar Wrapper */}
              <div className="p-8 pb-0">
                 {/* Progress Bar */}
                 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-8 overflow-hidden flex">
                    <div className={cn("h-full bg-blue-600 transition-all duration-500 ease-out", currentStep === 1 ? "w-1/2" : "w-full")} />
                 </div>
    
                 {/* Stepper Navigation Icons/Labels */}
                 <div className="flex items-center justify-start gap-12 px-2 pb-8 border-b border-slate-100 dark:border-slate-700/50 mb-8">
                    {/* Step 1 */}
                    <div 
                      onClick={() => setCurrentStep(1)}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                       <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all",
                          currentStep === 1 ? "bg-green-600 text-white shadow-lg shadow-green-200" : "bg-green-100 text-green-600 hover:bg-green-200"
                       )}>
                          {currentStep > 1 ? <span className="material-symbols-outlined text-[20px]">check</span> : "1"}
                       </div>
                       <span className={cn(
                          "text-sm font-bold tracking-tight transition-colors",
                          currentStep === 1 ? "text-slate-900 dark:text-white" : "text-green-600"
                       )}>General</span>
                    </div>
    
                    {/* Separator */}
                    <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-700" />
    
                    {/* Step 2 */}
                    <div 
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                       <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all",
                          currentStep === 2 ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                       )}>
                          2
                       </div>
                       <span className={cn(
                          "text-sm font-bold tracking-tight transition-colors",
                          currentStep === 2 ? "text-slate-900 dark:text-white" : "text-slate-400"
                       )}>Ubicaciones</span>
                    </div>
                 </div>
              </div>
    
              <form id="almacen-form" onSubmit={handleSubmit} className="p-8 pt-0 flex-1 overflow-y-auto max-h-[500px] min-h-[200px] custom-scrollbar">
                {currentStep === 1 ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="space-y-2">
                       <label className="block text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1">Nombre / Descripción del Almacén</label>
                       <p className="text-xs text-slate-400 mb-4 font-medium">Asigne un nombre descriptivo para identificar rápidamente el almacén.</p>
                       <input
                         required value={descripcion} onChange={e => setDescripcion(e.target.value)}
                         type="text"
                         className="w-full px-6 py-5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-inner"
                         placeholder="Ej: Almacén Logística Principal - Sede Norte..."
                       />
                    </div>

                    {/* Identificador de Posición card */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                       <div className="size-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-blue-600 text-[24px]">location_on</span>
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">Identificador de Posición</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                             Las ubicaciones permiten segmentar sus almacenes para una búsqueda rápida de materiales.
                          </p>
                       </div>
                    </div>
    
                    {/* Integrated Status Switch */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                          activo ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                        )}>
                          <span className="material-symbols-outlined text-[24px]">check_circle</span>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-1.5">Estado del Almacén</h4>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", activo ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                             <p className={cn("text-[10px] font-black uppercase tracking-widest", activo ? "text-green-600" : "text-slate-400")}>
                               {activo ? 'Operativo / Visible' : 'No Operativo / Oculto'}
                             </p>
                          </div>
                        </div>
                      </div>
                      <Switch checked={activo} onChange={setActivo} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="mb-6">
                          <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-1">Detalle de Ubicaciones</h4>
                          <div className="h-1 w-12 bg-blue-600 rounded-full" />
                        </div>
                       <button
                         type="button"
                         onClick={() => {
                           const willShow = !showUbicacionSelector
                           setShowUbicacionSelector(willShow)
                           if (willShow) fetchAvailableUbicaciones()
                         }}
                         className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[18px]">add</span>
                         Agregar Ubicación
                       </button>
                    </div>
    
                    {showUbicacionSelector && (
                      <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/20 rounded-3xl mb-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Selector de Ubicaciones</h4>
                          <button type="button" onClick={() => setShowUbicacionSelector(false)} className="size-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-200/50">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                        {loadingAvailable ? (
                          <div className="py-10 flex justify-center"><span className="material-symbols-outlined animate-spin text-blue-500 text-[32px]">progress_activity</span></div>
                        ) : availableUbicaciones.length === 0 ? (
                          <div className="py-8 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 text-center">
                             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">No hay ubicaciones disponibles</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableUbicaciones.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleAddUbicacion(u)}
                                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-inner">
                                  <span className="material-symbols-outlined text-[24px]">pin_drop</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-slate-900 dark:text-white truncate tracking-tight">{u.codigo}</p>
                                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{u.descripcion}</p>
                                </div>
                                <span className="material-symbols-outlined text-transparent group-hover:text-blue-500 transition-all text-[24px]">add_circle</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
    
                    <div className="space-y-3 pb-4">
                      {linkedUbicaciones.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-6">
                             <span className="material-symbols-outlined text-[48px] text-slate-300 font-light">inventory_2</span>
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin ubicaciones vinculadas</p>
                          <p className="text-[10px] text-slate-300 font-medium mt-1">Pulse el botón superior para agregar una nueva.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {linkedUbicaciones.map((u, idx) => (
                            <div
                              key={u.id}
                              className="flex items-center gap-5 p-5 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-700/50 rounded-3xl hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-sm"
                            >
                              <div className="flex items-center justify-center size-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white font-black text-xs shadow-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{u.codigo}</h4>
                                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
                                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/10 text-[9px] font-black text-blue-700 dark:text-blue-400 rounded-lg uppercase tracking-widest leading-none">
                                    UBICACIÓN
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-1.5">{u.descripcion}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveUbicacion(u.id)}
                                className="size-10 flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/10"
                                title="Desvincular"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-1 space-y-6">
            {/* Audit Info Card */}
            {almacenToEdit && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-8 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-8">Auditoría</h4>
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="size-11 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Creado por</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{almacenToEdit.usuario_creador?.nombre || '--'}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">{mounted && almacenToEdit.created_at ? format(new Date(almacenToEdit.created_at), 'dd MMM, hh:mm aa') : '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="size-11 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">history</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Modificación</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{almacenToEdit.usuario_modificador?.nombre || '--'}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">{mounted && almacenToEdit.updated_at ? format(new Date(almacenToEdit.updated_at), 'dd MMM, hh:mm aa') : '--'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIP PRO Card */}
            <div className="bg-[#0f172a] dark:bg-slate-950 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-[80px] text-white">lightbulb</span>
               </div>
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-blue-400">lightbulb</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Tip Pro</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    Utilice nomenclaturas estandarizadas (Pasillo-Estante-Nivel) para facilitar la labor de picking y almacenamiento.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
