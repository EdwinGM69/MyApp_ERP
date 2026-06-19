'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface ClasePedido {
  id: number
  codigo: string
  descripcion: string
  esquema_id: number
  estado_stock_id?: number
  esquema?: {
    id: number
    codigo: string
    descripcion: string
  }
  estado_stock?: {
    id: number
    codigo: string
    descripcion: string
  }
  tipo_operacion_id?: number
  tipo_operacion?: {
    id: number
    codigo: string
    descripcion: string
  }
  concepto_caja_id?: number
  concepto_caja?: {
    id: number
    codigo: string
    descripcion: string
  }
  operacion_extorno_id?: number
  operacion_extorno?: {
    id: number
    codigo: string
    descripcion: string
  }
  concepto_extorno_id?: number
  concepto_extorno?: {
    id: number
    codigo: string
    descripcion: string
  }
  registro_almacen: boolean
  registro_caja: boolean
  activo: boolean
}

export default function ClasesPedidoPage() {
  const permisos = usePermisos()
  // Master List
  const [clases, setClases] = useState<ClasePedido[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<ClasePedido | null>(null)

  // Editor State (Inline)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Auxiliary Data
  const [esquemas, setEsquemas] = useState<any[]>([])
  const [estadosStock, setEstadosStock] = useState<any[]>([])
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([])
  const [conceptosCaja, setConceptosCaja] = useState<any[]>([])
  const [activeModules, setActiveModules] = useState<string[]>([])

  // Fetch List
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/comercial/clases-pedido?search=${search}`)
      const json = await res.json()
      setClases(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar clases de pedido')
    } finally {
      setLoadingMaster(false)
    }
  }, [search, selectedId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const res = await apiFetch('/api/esquemas-calculo')
        const json = await res.json()
        setEsquemas(json.data || [])
        const res2 = await apiFetch('/api/estados-stock')
        const json2 = await res2.json()
        setEstadosStock(json2.data || [])
        const res3 = await apiFetch('/api/logistica/tipos-operacion')
        const json3 = await res3.json()
        setTiposOperacion(json3.data || [])
        const res4 = await apiFetch('/api/tesoreria/conceptos-caja')
        const json4 = await res4.json()
        setConceptosCaja(json4.data || [])

        // Fetch Company Modules
        const resMod = await apiFetch('/api/empresa/modulos')
        const jsonMod = await resMod.json()
        const activeModCodes = (jsonMod.data || []).filter((m: any) => m.activo).map((m: any) => m.codigo)
        setActiveModules(activeModCodes)
      } catch (err) {
        console.error('Error fetching aux data')
      }
    }
    fetchAux()
  }, [])

  useEffect(() => {
    if (selectedId) {
      setSelected(clases.find(c => c.id === selectedId) || null)
    }
  }, [selectedId, clases])

  const handleOpenEditor = (c?: any) => {
    const isInventarioActive = activeModules.includes('LOGISTICA')
    const isCajaActive = activeModules.includes('TESORERIA')

    setEditingData(c || {
      codigo: '',
      descripcion: '',
      esquema_id: esquemas.length > 0 ? esquemas[0].id : '',
      estado_stock_id: '',
      tipo_operacion_id: (c?.tipo_operacion_id && isInventarioActive) ? c.tipo_operacion_id : '',
      concepto_caja_id: (c?.concepto_caja_id && isCajaActive) ? c.concepto_caja_id : '',
      operacion_extorno_id: (c?.operacion_extorno_id && isInventarioActive) ? c.operacion_extorno_id : '',
      concepto_extorno_id: (c?.concepto_extorno_id && isCajaActive) ? c.concepto_extorno_id : '',
      registro_almacen: isInventarioActive ? (c?.registro_almacen ?? false) : false,
      registro_caja: isCajaActive ? (c?.registro_caja ?? false) : false,
      activo: c?.activo ?? true
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return
    if (!editingData.codigo || !editingData.descripcion || !editingData.esquema_id) {
      toast.error('Complete todos los campos requeridos')
      return
    }

    if (editingData.registro_almacen && !editingData.tipo_operacion_id) {
      toast.error('Seleccione un tipo de operación para almacén')
      return
    }
    if (editingData.registro_caja && !editingData.concepto_caja_id) {
      toast.error('Seleccione un concepto de caja')
      return
    }
    if (!editingData.esquema_id) {
      toast.error('Seleccione un esquema de cálculo')
      return
    }
    if (!editingData.estado_stock_id) {
      toast.error('Seleccion un estado de stock para la clase de pedido')
      return
    }

    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/comercial/clases-pedido', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingData)
      })
      if (res.ok) {
        toast.success(isNew ? 'Clase creada' : 'Clase actualizada')
        setIsEditing(false)
        fetchList()
      } else {
        const json = await res.json()
        toast.error(`${json.error}${json.details ? ': ' + json.details : ''}`)
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Clases de Pedido" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Listado Maestro</h3>
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
                placeholder="Buscar clase..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm outline-none shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
            {loadingMaster ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs font-medium uppercase tracking-widest">Cargando...</span>
              </div>
            ) : clases.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-2xl group relative",
                  selectedId === c.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors font-black text-xs",
                    selectedId === c.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {c.codigo.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === c.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {c.descripcion}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      CÓDIGO: {c.codigo}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950 p-8">
          {isEditing && editingData ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
              {/* Editor Header */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl font-variation-icon">settings_applications</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-1">
                      {editingData.id ? 'Refinar Definición' : 'Nueva Definición'}
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      Configuración Técnica Maestro
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="size-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 active:scale-90"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: General Data */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Card: Información Básica */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <span className="material-symbols-outlined text-primary">info</span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Información General</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código de Clase</label>
                        <input
                          type="text"
                          value={editingData.codigo}
                          onChange={(e) => setEditingData({ ...editingData, codigo: e.target.value.toUpperCase() })}
                          disabled={!!editingData?.id}
                          placeholder="EJ: VENTA_LOCAL"
                          className={cn(
                            "w-full h-14 px-6 border rounded-2xl outline-none text-sm font-black uppercase transition-all",
                            editingData?.id
                              ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                              : "bg-slate-50/50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-primary/5 text-primary"
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado Operativo</label>
                        <div className="h-14 px-6 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            editingData.activo ? "text-emerald-500" : "text-slate-400"
                          )}>
                            {editingData.activo ? 'HABILITADO' : 'DESHABILITADO'}
                          </span>
                          <Switch
                            checked={editingData.activo}
                            onChange={(c) => setEditingData({ ...editingData, activo: c })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción Detallada</label>
                      <input
                        type="text"
                        value={editingData.descripcion}
                        onChange={(e) => setEditingData({ ...editingData, descripcion: e.target.value })}
                        placeholder="Ej: Pedido para venta minorista de salón"
                        className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                    </div>
                  </div>

                  {/* Card: Lógica de Venta & Stock */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <span className="material-symbols-outlined text-amber-500">point_of_sale</span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reglas Comerciales y Stock</h3>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Esquema de Cálculo Fiscal/Financiero</label>
                        <div className="relative group">
                          <select
                            value={editingData.esquema_id}
                            onChange={(e) => setEditingData({ ...editingData, esquema_id: Number(e.target.value) })}
                            className="w-full h-14 pl-6 pr-12 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 uppercase appearance-none transition-all"
                          >
                            <option value="">SELECCIONAR ESQUEMA...</option>
                            {esquemas.map(esc => (
                              <option key={esc.id} value={esc.id}>{esc.descripcion} ({esc.codigo})</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors">calculate</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado de Stock al Procesar</label>
                        <div className="relative group">
                          <select
                            value={editingData.estado_stock_id || ''}
                            onChange={(e) => setEditingData({ ...editingData, estado_stock_id: e.target.value ? Number(e.target.value) : null })}
                            className="w-full h-14 pl-6 pr-12 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 uppercase appearance-none transition-all"
                          >
                            <option value="">NINGUNO (SIN IMPACTO EN STOCK)...</option>
                            {estadosStock.map(est => (
                              <option key={est.id} value={est.id}>{est.descripcion} ({est.codigo})</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-amber-500 transition-colors">analytics</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Module Integration */}
                <div className="space-y-6">
                  {/* Card: Módulo Almacén */}
                  <div className={cn(
                    "bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all group",
                    !activeModules.includes('LOGISTICA') && "opacity-60 saturate-50"
                  )}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">inventory_2</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Almacén</h3>
                      </div>
                      <Switch
                        checked={editingData.registro_almacen}
                        disabled={!activeModules.includes('LOGISTICA')}
                        onChange={(c) => setEditingData({
                          ...editingData,
                          registro_almacen: c,
                          tipo_operacion_id: c ? editingData.tipo_operacion_id : null
                        })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Operación</label>
                        <select
                          value={editingData.tipo_operacion_id || ''}
                          disabled={!editingData.registro_almacen || !activeModules.includes('LOGISTICA')}
                          onChange={(e) => setEditingData({ ...editingData, tipo_operacion_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none transition-all uppercase disabled:opacity-30"
                        >
                          <option value="">SIN OPERACIÓN...</option>
                          {tiposOperacion.map(tp => (
                            <option key={tp.id} value={tp.id}>{tp.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operación de Extorno</label>
                        <select
                          value={editingData.operacion_extorno_id || ''}
                          disabled={!editingData.registro_almacen || !activeModules.includes('LOGISTICA')}
                          onChange={(e) => setEditingData({ ...editingData, operacion_extorno_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none transition-all uppercase disabled:opacity-30"
                        >
                          <option value="">SIN OPERACIÓN EXTORNO...</option>
                          {tiposOperacion.map(tp => (
                            <option key={tp.id} value={tp.id}>{tp.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      {!activeModules.includes('LOGISTICA') && (
                        <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-slate-400">lock</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Módulo Inventario no activo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Módulo Caja */}
                  <div className={cn(
                    "bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 transition-all group",
                    !activeModules.includes('TESORERIA') && "opacity-60 saturate-50"
                  )}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">payments</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caja</h3>
                      </div>
                      <Switch
                        checked={editingData.registro_caja}
                        disabled={!activeModules.includes('TESORERIA')}
                        onChange={(c) => setEditingData({
                          ...editingData,
                          registro_caja: c,
                          concepto_caja_id: c ? editingData.concepto_caja_id : null
                        })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto de Caja</label>
                        <select
                          value={editingData.concepto_caja_id || ''}
                          disabled={!editingData.registro_caja || !activeModules.includes('TESORERIA')}
                          onChange={(e) => setEditingData({ ...editingData, concepto_caja_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none transition-all uppercase disabled:opacity-30"
                        >
                          <option value="">SIN CONCEPTO...</option>
                          {conceptosCaja.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto de Extorno</label>
                        <select
                          value={editingData.concepto_extorno_id || ''}
                          disabled={!editingData.registro_caja || !activeModules.includes('TESORERIA')}
                          onChange={(e) => setEditingData({ ...editingData, concepto_extorno_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-12 px-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none transition-all uppercase disabled:opacity-30"
                        >
                          <option value="">SIN CONCEPTO EXTORNO...</option>
                          {conceptosCaja.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.descripcion}</option>
                          ))}
                        </select>
                      </div>
                      {!activeModules.includes('TESORERIA') && (
                        <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-slate-400">lock</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Módulo Caja no activo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="p-2 bg-primary rounded-3xl shadow-xl shadow-primary/20">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full h-14 rounded-2xl bg-white text-primary text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {saving ? (
                        <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <>
                          CONSOLIDAR CAMBIOS
                          <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
              {/* Modern Detail Header */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6 duration-1000 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl">award_star</span>
                </div>

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 px-4 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xs tracking-tighter uppercase">
                        {selected.codigo}
                      </div>
                      <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] h-8 px-4 rounded-xl">
                        {selected.activo ? 'VIGENTE' : 'OBSOLETO'}
                      </Badge>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase max-w-2xl">
                      {selected.descripcion}
                    </h2>
                  </div>

                  {permisos.editar && (
                    <button
                      onClick={() => handleOpenEditor(selected)}
                      className="h-14 px-8 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:scale-[1.03] shadow-2xl shadow-slate-900/20 dark:shadow-white/5 transition-all active:scale-95 flex items-center gap-3 shrink-0 uppercase tracking-widest"
                    >
                      <span className="material-symbols-outlined text-xl">stylus_note</span>
                      Ajustar Definición
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Data Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Rules & Finance */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-3">
                      <span className="size-2 rounded-full bg-primary" />
                      Parámetros Comerciales
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex items-start gap-5">
                        <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-2xl">calculate</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Esquema de Cálculo</p>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-0.5">
                            {selected.esquema?.descripcion}
                          </h4>
                          <p className="text-[9px] font-black text-primary uppercase">CÓDIGO: {selected.esquema?.codigo}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-5">
                        <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-2xl">database</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto en Stock</p>
                          {selected.estado_stock ? (
                            <>
                              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-0.5">
                                {selected.estado_stock.descripcion}
                              </h4>
                              <p className="text-[9px] font-black text-amber-500 uppercase">CÓDIGO: {selected.estado_stock.codigo}</p>
                            </>
                          ) : (
                            <p className="text-sm font-black text-slate-300 italic">SIN AFECTACIÓN</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-3">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Interconexión de Módulos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                        <div className={cn(
                          "size-12 rounded-2xl flex items-center justify-center shrink-0",
                          selected.registro_almacen ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}>
                          <span className="material-symbols-outlined text-xl">inventory</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ALMACÉN</p>
                          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase">
                            {selected.registro_almacen ? (selected.tipo_operacion?.descripcion || 'ACTIVO') : 'INACTIVO'}
                          </h5>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                        <div className={cn(
                          "size-12 rounded-2xl flex items-center justify-center shrink-0",
                          selected.registro_caja ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}>
                          <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TESORERÍA</p>
                          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase">
                            {selected.registro_caja ? (selected.concepto_caja?.descripcion || 'ACTIVO') : 'INACTIVO'}
                          </h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit & Info Sidebar */}
                <div className="space-y-8">

                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="size-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-3xl">help_center</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">¿Necesitas Ayuda?</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        Esta parametrización define cómo se comportan las órdenes de venta en los módulos de facturación, almacén y caja de forma simultánea.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-8 animate-in fade-in duration-1000">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="size-48 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-2xl relative">
                  <span className="material-symbols-outlined text-8xl opacity-10 font-variation-icon text-primary">order_approve</span>
                  <div className="absolute -bottom-2 -right-2 size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined">api</span>
                  </div>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 leading-none">Plataforma ERP v2.0</p>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">Gestión de Clases de Pedido</h3>
                <p className="text-[11px] font-medium text-slate-400 italic">Selecciona un elemento de la lista para administrar sus reglas de negocio.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
