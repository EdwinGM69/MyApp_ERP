'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import CrudModal from '@/components/ui/CrudModal'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface Esquema {
  id?: number
  codigo: string
  nombre: string
  descripcion: string | null
  metodo_costo: string | null
  decimal_precision: number
  requiere_aprobacion: boolean
  activo: boolean
  reglas?: Regla[]
  updated_at?: string | null
  usuario_modificador?: { nombre: string } | null
}

interface Regla {
  id?: number
  esquema_id?: number
  tipo_regla: string
  umbral_valor: string | null
  accion: string | null
  orden: number
  activo: boolean
}

interface Log {
  id: number
  campo_modificado: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  motivo: string | null
  created_at: string
  usuario_creador: { nombre: string; rol: { nombre: string } }
}

const DEFAULT_ESQUEMA: Esquema = {
  codigo: '',
  nombre: '',
  descripcion: '',
  metodo_costo: 'Precio estándar',
  decimal_precision: 2,
  requiere_aprobacion: false,
  activo: true,
}

const DEFAULT_REGLA: Regla = {
  tipo_regla: 'Variación al alza',
  umbral_valor: '> 10%',
  accion: 'Alertar supervisor',
  orden: 1,
  activo: true
}

export default function EsquemasValoracionPage() {
  const permisos = usePermisos()
  // Master List
  const [esquemas, setEsquemas] = useState<Esquema[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedEsquema, setSelectedEsquema] = useState<Esquema | null>(null)

  // Editor State (Inline)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<Esquema | null>(null)
  const [saving, setSaving] = useState(false)

  // Sub-data (Logs & rules editing)
  const [logs, setLogs] = useState<Log[]>([])
  const [mounted, setMounted] = useState(false)

  // Rule Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Regla | null>(null)
  const [savingRule, setSavingRule] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchList = useCallback(async (selectFirst = false) => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/logistica/esquemas-valoracion?search=${search}`)
      const json = await res.json()
      setEsquemas(json.data || [])
      if (selectFirst && json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
      }
    } catch (err) {
      toast.error('Error al cargar esquemas')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])

  const hasInitialLoaded = useRef(false)
  
  useEffect(() => { 
    if (!hasInitialLoaded.current) {
        fetchList(true)
        hasInitialLoaded.current = true
    } else {
        fetchList(false)
    }
  }, [fetchList])

  const fetchDetails = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/api/logistica/esquemas-valoracion?id=${id}`)
      const json = await res.json()
      setSelectedEsquema(json.data)
    } catch (err) {
      toast.error('Error al cargar detalles')
    }
  }, [])

  const fetchExtras = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/api/logistica/esquemas-valoracion/${id}/logs`)
      const json = await res.json()
      setLogs(json.data || [])
    } catch (err) {}
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchDetails(selectedId)
      fetchExtras(selectedId)
      setIsEditing(false)
    } else {
      setSelectedEsquema(null)
      setLogs([])
    }
  }, [selectedId, fetchDetails, fetchExtras])

  const handleOpenEditor = (esquema?: Esquema) => {
    setEditingData(esquema || { ...DEFAULT_ESQUEMA })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return
    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/logistica/esquemas-valoracion', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingData)
      })
      if (res.ok) {
        toast.success(isNew ? 'Esquema creado' : 'Esquema actualizado')
        setIsEditing(false)
        const json = await res.json()
        if (isNew && json.id) {
          setSelectedId(json.id)
        }
        fetchList()
      } else {
        const json = await res.json()
        toast.error(json.error || 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Rule Logic
  const handleOpenRuleModal = (rule?: Regla) => {
    setEditingRule(rule || { ...DEFAULT_REGLA, esquema_id: selectedId || undefined })
    setRuleModalOpen(true)
  }

  const handleSaveRule = async () => {
    if (!editingRule || !selectedId) return
    setSavingRule(true)
    try {
      const isNew = !editingRule.id
      const res = await apiFetch(`/api/logistica/esquemas-valoracion/${selectedId}/reglas`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingRule)
      })
      if (res.ok) {
        toast.success(isNew ? 'Regla agregada' : 'Regla actualizada')
        setRuleModalOpen(false)
        fetchDetails(selectedId)
      } else {
        const json = await res.json()
        toast.error(json.error || 'Error al guardar regla')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSavingRule(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950 font-sans">
      <Topbar title="Esquemas de Valoración" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Listado Maestro</h3>
              {permisos.crear && (
                <button
                  onClick={() => {
                    setSelectedId(null);
                    handleOpenEditor();
                  }}
                  className="size-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                </button>
              )}
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar esquema..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm outline-none shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
            {loadingMaster ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs font-medium uppercase tracking-widest">Cargando...</span>
              </div>
            ) : esquemas.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id || null)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-2xl group relative",
                  selectedId === e.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors font-black text-xs",
                    selectedId === e.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {e.codigo.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === e.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {e.nombre}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      CÓD: {e.codigo}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-10">
          {isEditing && editingData ? (
             <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
               <div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-2">
                   {editingData.id ? 'Actualizar Definición' : 'Nueva Definición'}
                 </h2>
                 <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Esquemas de Valoración Logística</p>
               </div>
               <button
                 onClick={() => {
                     setIsEditing(false);
                     if (!selectedId && esquemas.length > 0) {
                         setSelectedId(esquemas[0].id || null);
                     }
                 }}
                 className="size-11 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90"
               >
                 <span className="material-symbols-outlined">close</span>
               </button>
             </div>

             <div className="space-y-8">
               {/* Identificación */}
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Único</label>
                   <input
                      type="text"
                      value={editingData.codigo}
                      onChange={(e) => setEditingData({ ...editingData, codigo: e.target.value })}
                      disabled={!!editingData?.id}
                      placeholder="Ej: MAT-STD"
                      className={cn(
                        "w-full h-12 px-5 border rounded-2xl outline-none text-sm font-black uppercase transition-all",
                        editingData?.id
                          ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20"
                      )}
                    />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado del Registro</label>
                   <div className="h-12 flex items-center">
                     <Switch
                       checked={editingData.activo}
                       onChange={(c) => setEditingData({ ...editingData, activo: c })}
                     />
                     <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Habilitado</span>
                   </div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Esquema</label>
                 <input
                   type="text"
                   value={editingData.nombre}
                   onChange={(e) => setEditingData({ ...editingData, nombre: e.target.value })}
                   placeholder="Ej: Materiales estándar"
                   className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                 />
               </div>

               <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                   <textarea 
                       value={editingData.descripcion || ''}
                       onChange={(e) => setEditingData({...editingData, descripcion: e.target.value})}
                       rows={3}
                       className="w-full p-5 bg-[#f9f9f8] dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-slate-950/5 focus:border-slate-950 transition-all outline-none resize-none placeholder:text-slate-400"
                       placeholder="Añade una descripción sobre el uso de este esquema..."
                   />
               </div>

               <div className="space-y-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">MÉTODO DE VALORACIÓN</p>
                 <div className="grid grid-cols-2 gap-6">
                     {[
                         { title: 'Precio estándar', desc: 'Precio fijo definido manualmente. No cambia con movimientos. Ideal para materiales con precio negociado.' },
                         { title: 'Promedio móvil', desc: 'Se recalcula automáticamente con cada compra. Refleja el costo real de adquisición.' }
                     ].map((m) => (
                         <button 
                             key={m.title}
                             onClick={() => setEditingData({...editingData, metodo_costo: m.title})}
                             className={cn(
                                 "p-6 text-left rounded-2xl border-2 transition-all group relative overflow-hidden",
                                 editingData.metodo_costo === m.title 
                                   ? "bg-blue-50/20 dark:bg-blue-900/10 border-blue-500 shadow-sm" 
                                   : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                             )}
                         >
                             <h4 className={cn("text-sm font-black mb-2 transition-colors", editingData.metodo_costo === m.title ? "text-blue-600" : "text-slate-800 dark:text-white")}>
                                 {m.title}
                             </h4>
                             <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{m.desc}</p>
                             {editingData.metodo_costo === m.title && (
                                 <div className="absolute top-4 right-4 text-blue-500">
                                     <span className="material-symbols-outlined text-base font-black">check_circle</span>
                                 </div>
                             )}
                         </button>
                     ))}
                 </div>
               </div>

               <div className="space-y-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">PARÁMETROS DE CONTROL</p>
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Precisión decimal</label>
                         <div className="relative">
                             <select 
                                 value={editingData.decimal_precision}
                                 onChange={(e) => setEditingData({...editingData, decimal_precision: Number(e.target.value)})}
                                 style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                                 className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer uppercase tracking-widest"
                             >
                                 <option value={0}>0 decimales</option>
                                 <option value={2}>2 decimales</option>
                                 <option value={4}>4 decimales</option>
                             </select>
                             <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                         </div>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 h-[68px] mt-[18px]">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Requerir Aprobación</span>
                         <Switch
                           checked={editingData.requiere_aprobacion}
                           onChange={(c) => setEditingData({ ...editingData, requiere_aprobacion: c })}
                         />
                     </div>
                 </div>
               </div>

               <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                 <button
                   onClick={handleSave}
                   disabled={saving}
                   className="w-48 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
                 >
                   {saving ? (
                     <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                   ) : 'Guardar'}
                 </button>
               </div>
             </div>
           </div>
          ) : selectedEsquema ? (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
               {/* Header Section */}
               <div className="flex items-start justify-between">
                 <div>
                   <div className="flex items-center gap-4 mb-2">
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                       {selectedEsquema.nombre}
                     </h2>
                     <Badge variant={selectedEsquema.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                       {selectedEsquema.activo ? 'Activo' : 'Inactivo'}
                     </Badge>
                   </div>
                   <p className="text-slate-400 text-sm font-medium tracking-tight">
                     Esquema Logístico · Código Maestro: {selectedEsquema.codigo}
                   </p>
                 </div>
                 <div className="flex gap-2">
                    {permisos.editar && (
                      <button
                        onClick={() => handleOpenEditor(selectedEsquema)}
                        className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        Editar Configuración
                      </button>
                    )}
                 </div>
               </div>

               <div className="space-y-12">
                   {/* Data Grid */}
                   <div className="grid grid-cols-2 gap-10">
                       <div className="space-y-6">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">PARÁMETROS DEL ESQUEMA</p>
                           <div className="grid grid-cols-1 gap-6">
                               <div className={cn(
                                   "p-6 rounded-3xl border transition-all",
                                   selectedEsquema.metodo_costo === 'Precio estándar'
                                     ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ring-1 ring-blue-50 dark:ring-blue-900/20"
                                     : "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 ring-1 ring-green-50 dark:ring-green-900/20"
                               )}>
                                   <span className={cn(
                                       "text-[10px] font-black uppercase tracking-widest block mb-4",
                                       selectedEsquema.metodo_costo === 'Precio estándar' ? "text-blue-500" : "text-green-500"
                                   )}>MÉTODO DE COSTO</span>
                                   <div className="flex items-center justify-between">
                                       <div>
                                           <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{selectedEsquema.metodo_costo}</h4>
                                       </div>
                                       <span className={cn(
                                            "material-symbols-outlined text-3xl",
                                            selectedEsquema.metodo_costo === 'Precio estándar' ? 'text-blue-500' : 'text-green-500'
                                        )}>
                                            {selectedEsquema.metodo_costo === 'Precio estándar' ? 'price_check' : 'query_stats'}
                                        </span>
                                   </div>
                               </div>

                               <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">CONFIGURACIÓN ESPECÍFICA</span>
                                   <div className="space-y-4">
                                       <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                           <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Precisión de decimales</span>
                                           <span className="text-sm font-black text-slate-800 dark:text-white">{selectedEsquema.decimal_precision}</span>
                                       </div>
                                       <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                           <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Requiere aprobación</span>
                                           <span className={cn(
                                                "text-xs font-black uppercase tracking-widest px-3 py-1 rounded-md",
                                                selectedEsquema.requiere_aprobacion ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                           )}>{selectedEsquema.requiere_aprobacion ? 'SÍ' : 'NO'}</span>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>
                       <div className="space-y-6">
                           <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HISTORIAL RECIENTE</p>
                           </div>
                           <div className="space-y-3">
                               {logs.slice(0, 3).map((log) => {
                                  const isOrange = log.campo_modificado?.includes('Precisión') || log.campo_modificado?.includes('Variación');
                                  return (
                                    <div key={log.id} className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all shadow-sm">
                                      <div className="flex items-start gap-3">
                                        <div className={cn("size-2 rounded-full mt-1.5 shrink-0", isOrange ? "bg-orange-500" : "bg-green-500")} />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[12px] text-slate-600 dark:text-slate-400 leading-tight">
                                            {log.campo_modificado ? (
                                              <>
                                                <span className="font-bold text-slate-900 dark:text-white">{log.campo_modificado}</span>
                                                {' '}ajustado de{' '}<span className="font-bold text-slate-900 dark:text-white">{log.valor_anterior || '---'}</span> a <span className="font-bold text-slate-900 dark:text-white">{log.valor_nuevo || '---'}</span>
                                              </>
                                            ) : (
                                                <span className="font-bold text-slate-900 dark:text-white">{log.motivo || 'Actualización'}</span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium">
                                             <span>{log.usuario_creador?.nombre}</span>
                                             <span>{mounted ? new Date(log.created_at).toLocaleDateString('es-ES') : ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                               })}
                               {logs.length === 0 && (
                                   <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                       <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">history</span>
                                       <p className="text-slate-400 text-xs italic">Sin historial reciente</p>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>

                   {/* Rule Grid */}
                   <div className="space-y-6 pt-6">
                       <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGLAS AUTOMÁTICAS ASOCIADAS</p>
                            {permisos.crear && (
                                <button 
                                    onClick={() => handleOpenRuleModal()}
                                    className="text-[10px] font-black uppercase text-primary hover:underline"
                                >
                                    + Agregar Regla
                                </button>
                            )}
                       </div>
                       
                       <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                           <table className="w-full text-left">
                               <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                                   <tr>
                                       <th className="py-4 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condición</th>
                                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Umbral</th>
                                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                       <th className="py-4 w-24"></th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-slate-800 dark:text-slate-300">
                                   {selectedEsquema.reglas && selectedEsquema.reglas.length > 0 ? selectedEsquema.reglas.map((r) => {
                                       let actionStyle = "bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400";
                                       if (r.accion?.toLowerCase().includes('bloquear')) actionStyle = "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400";
                                       if (r.accion?.toLowerCase().includes('notificar')) actionStyle = "bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400";

                                       return (
                                           <tr key={r.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                               <td className="py-5 pl-6 text-xs font-bold text-slate-800 dark:text-white">{r.tipo_regla}</td>
                                               <td className="py-5 text-xs font-bold text-slate-500">{r.umbral_valor}</td>
                                               <td className="py-5">
                                                  <span className={cn(
                                                      "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight",
                                                      actionStyle
                                                  )}>
                                                   {r.accion}
                                                  </span>
                                               </td>
                                               <td className="py-5 text-center">
                                                   <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        r.activo ? "text-green-500" : "text-slate-300"
                                                   )}>
                                                       {r.activo ? 'Activa' : 'Inactiva'}
                                                   </span>
                                               </td>
                                                <td className="py-5 pr-6 text-right">
                                                    {permisos.editar && (
                                                        <button 
                                                            onClick={() => handleOpenRuleModal(r)}
                                                            className="text-slate-400 hover:text-primary transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                    )}
                                                </td>
                                           </tr>
                                       )
                                   }) : (
                                       <tr>
                                           <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-medium italic">
                                                Sin reglas configuradas
                                           </td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
               <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                 <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">payments</span>
               </div>
               <div className="text-center">
                 <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Esquemas de Valoración</p>
                 <p className="text-xs font-medium text-slate-400 italic">Seleccione un esquema maestro para visualizarlo.</p>
               </div>
             </div>
          )}
        </div>
      </div>

       {/* Rule Modal */}
       <CrudModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule?.id ? 'Editar regla' : 'Agregar regla'}
        size="md"
      >
        {editingRule && (
          <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Condición</label>
                <div className="relative">
                    <select 
                        value={editingRule.tipo_regla}
                        onChange={(e) => setEditingRule({...editingRule, tipo_regla: e.target.value})}
                        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                        className="w-full h-11 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none cursor-pointer"
                    >
                        <option>Variación al alza</option>
                        <option>Variación a la baja</option>
                        <option>Sin actualización</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Umbral / Valor</label>
                <input 
                    type="text" 
                    value={editingRule.umbral_valor || ''}
                    onChange={(e) => setEditingRule({...editingRule, umbral_valor: e.target.value})}
                    placeholder="Ej: > 15%"
                    className="w-full h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Acción</label>
                <div className="relative">
                    <select 
                        value={editingRule.accion || ''}
                        onChange={(e) => setEditingRule({...editingRule, accion: e.target.value})}
                        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                        className="w-full h-11 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none cursor-pointer"
                    >
                        <option>Alertar supervisor</option>
                        <option>Alertar administrador</option>
                        <option>Bloquear y requerir aprobación</option>
                        <option>Notificar responsable</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Orden de ejecución</label>
                <input 
                    type="number" 
                    value={editingRule.orden}
                    onChange={(e) => setEditingRule({...editingRule, orden: Number(e.target.value)})}
                    placeholder="1"
                    className="w-full h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium focus:ring-4 focus:ring-slate-950/5 focus:border-slate-950 transition-all font-black"
                />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Estado activo</span>
                <Switch 
                    checked={editingRule.activo}
                    onChange={(c) => setEditingRule({...editingRule, activo: c})}
                />
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button 
                    onClick={() => setRuleModalOpen(false)}
                    className="flex-1 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all font-sans"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSaveRule}
                    disabled={savingRule}
                    className="flex-1 h-12 rounded-2xl bg-slate-900 border border-slate-900 text-white text-sm font-black disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/10 font-sans"
                >
                    {savingRule ? 'Guardando...' : 'Guardar regla'}
                 </button>
            </div>
          </div>
        )}
      </CrudModal>

    </div>
  )
}
