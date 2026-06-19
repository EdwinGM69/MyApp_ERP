'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import CrudModal from '@/components/ui/CrudModal'
import MaterialSelect from '@/components/ui/MaterialSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface TipoCondicion {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
  _count?: { condiciones: number }
}

interface Condicion {
  id?: number
  tipo_condicion_id: number
  material_id: number | null
  moneda_id: number
  porcentaje: boolean
  valor: number
  fecha_desde: string
  fecha_hasta: string | null
  activo: boolean
  material?: { descripcion: string; codigo: string }
  moneda?: { simbolo: string; abreviatura: string }
}

export default function CondicionesComercialesPage() {
  const permisos = usePermisos()
  // Master Lists
  const [tiposCondicion, setTiposCondicion] = useState<TipoCondicion[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  // Selection
  const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoCondicion | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Detail Lists (for Condiciones)
  const [condiciones, setCondiciones] = useState<Condicion[]>([])

  // Modals
  const [condicionModalOpen, setCondicionModalOpen] = useState(false)
  const [editingCondicion, setEditingCondicion] = useState<Condicion | null>(null)
  const [savingCondicion, setSavingCondicion] = useState(false)

  const [tipoModalOpen, setTipoModalOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<any>(null)
  const [savingTipo, setSavingTipo] = useState(false)

  // Inline Addition State
  const [isAddingTipo, setIsAddingTipo] = useState(false)
  const [newTipoData, setNewTipoData] = useState({ codigo: '', descripcion: '', activo: true })
  const [defaultMonedaId, setDefaultMonedaId] = useState<number>(1)

  const [isAddingCondicion, setIsAddingCondicion] = useState(false)
  const [newCondicionData, setNewCondicionData] = useState<Condicion>({
    tipo_condicion_id: 0,
    material_id: null,
    moneda_id: 1,
    porcentaje: false,
    valor: 0,
    fecha_desde: '',
    fecha_hasta: null,
    activo: true
  })
 
  // Inline Edit State (for list items)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<Condicion | null>(null)

  // Fetch Master Lists
  const fetchMaster = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const [tiposRes, sessionRes] = await Promise.all([
        apiFetch(`/api/tipos-condicion?search=${search}`),
        apiFetch('/api/auth/me')
      ])
      
      const tiposJson = await tiposRes.json()
      const sessionJson = await sessionRes.json()

      setTiposCondicion(tiposJson.data || [])
      
      if (sessionJson.user?.monedaId) {
        setDefaultMonedaId(sessionJson.user.monedaId)
      }

      if (tiposJson.data?.length > 0 && !selectedTipoId) {
        setSelectedTipoId(tiposJson.data[0].id)
        setSelectedTipo(tiposJson.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar datos maestros')
    } finally {
      setLoadingMaster(false)
    }
  }, [search, selectedTipoId])

  // Fetch Details (Condiciones for a Tipo)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !newCondicionData.fecha_desde) {
      setNewCondicionData(prev => ({
        ...prev,
        fecha_desde: new Date().toISOString().split('T')[0]
      }))
    }
  }, [mounted, newCondicionData.fecha_desde])

  const fetchCondiciones = useCallback(async (tipoId: number) => {
    setLoadingDetail(true)
    try {
      const res = await apiFetch(`/api/comercial/condiciones?tipo_condicion_id=${tipoId}`)
      const json = await res.json()
      setCondiciones(json.data || [])
    } catch (err) {
      toast.error('Error al cargar valores')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchMaster()
  }, [fetchMaster])

  useEffect(() => {
    if (selectedTipoId) {
      fetchCondiciones(selectedTipoId)
      setSelectedTipo(tiposCondicion.find(t => t.id === selectedTipoId) || null)
    }
  }, [selectedTipoId, tiposCondicion, fetchCondiciones])

  // Condicion CRUD
  const handleOpenCondicionModal = (c?: Condicion) => {
    setEditingCondicion(c || {
      tipo_condicion_id: selectedTipoId!,
      material_id: null,
      moneda_id: defaultMonedaId,
      porcentaje: false,
      valor: 0,
      fecha_desde: new Date().toISOString().split('T')[0],
      fecha_hasta: null,
      activo: true
    })
    setCondicionModalOpen(true)
  }

  const handleCreateCondicionInline = () => {
    setNewCondicionData({
      tipo_condicion_id: selectedTipoId!,
      material_id: null,
      moneda_id: defaultMonedaId,
      porcentaje: false,
      valor: 0,
      fecha_desde: new Date().toISOString().split('T')[0],
      fecha_hasta: null,
      activo: true
    })
    setIsAddingCondicion(true)
  }

  const handleSaveCondicionInline = async () => {
    if (newCondicionData.material_id === 0) {
      toast.error('Debe seleccionar un material')
      return
    }
    if (newCondicionData.valor <= 0) {
      toast.error('El valor debe ser mayor a 0')
      return
    }
    setSavingCondicion(true)
    try {
      const res = await apiFetch('/api/comercial/condiciones', {
        method: 'POST',
        body: JSON.stringify(newCondicionData)
      })
      if (res.ok) {
        toast.success('Valor agregado')
        setIsAddingCondicion(false)
        fetchCondiciones(selectedTipoId!)
      } else {
        const json = await res.json()
        toast.error(typeof json.error === 'string' ? json.error : 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSavingCondicion(false)
    }
  }

  const handleSaveCondicion = async (dataOverride?: Condicion) => {
    const data = dataOverride || editingCondicion
    if (!data) return
    if (data.material_id === 0) {
      toast.error('Debe seleccionar un material')
      return
    }
    if (data.valor <= 0) {
      toast.error('El valor debe ser mayor a 0')
      return
    }
    setSavingCondicion(true)
    try {
      const isNew = !data.id
      const res = await apiFetch('/api/comercial/condiciones', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.success(isNew ? 'Valor agregado' : 'Valor actualizado')
        setCondicionModalOpen(false)
        setExpandedId(null)
        fetchCondiciones(selectedTipoId!)
      } else {
        const json = await res.json()
        toast.error(typeof json.error === 'string' ? json.error : 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSavingCondicion(false)
    }
  }

  // Tipo CRUD
  const handleOpenTipoModal = (t?: any) => {
    setEditingTipo(t || { codigo: '', descripcion: '', activo: true })
    setTipoModalOpen(true)
  }

  const handleSaveTipo = async () => {
    if (!editingTipo) return
    setSavingTipo(true)
    try {
      const isNew = !editingTipo.id
      const res = await apiFetch('/api/tipos-condicion', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingTipo)
      })
      if (res.ok) {
        toast.success('Guardado correctamente')
        setTipoModalOpen(false)
        fetchMaster()
      } else {
        const json = await res.json()
        toast.error(typeof json.error === 'string' ? json.error : 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSavingTipo(false)
    }
  }

  const handleSaveTipoInline = async () => {
    if (!newTipoData.codigo || !newTipoData.descripcion) {
      toast.error('Código y Descripción son obligatorios')
      return
    }
    setSavingTipo(true)
    try {
      const res = await apiFetch('/api/tipos-condicion', {
        method: 'POST',
        body: JSON.stringify(newTipoData)
      })
      if (res.ok) {
        toast.success('Tipo de condición creado')
        setIsAddingTipo(false)
        fetchMaster()
      } else {
        const json = await res.json()
        toast.error(typeof json.error === 'string' ? json.error : 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSavingTipo(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Condiciones Comerciales" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipos de Condición</h3>
              <button
                onClick={() => {
                  setNewTipoData({ codigo: '', descripcion: '', activo: true })
                  setIsAddingTipo(true)
                }}
                className="size-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-xl font-bold">add</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar condición..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm outline-none shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-8 custom-scrollbar">
            {isAddingTipo && (
              <div className="bg-white dark:bg-slate-800 border border-blue-500/30 rounded-2xl p-5 mb-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Nueva Definición</h3>
                  <button onClick={() => setIsAddingTipo(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Código</label>
                    <input
                      value={newTipoData.codigo}
                      onChange={e => setNewTipoData({ ...newTipoData, codigo: e.target.value.toUpperCase() })}
                      placeholder="EJ: LPRC"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs font-black outline-none transition-all placeholder:text-slate-400 uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Descripción</label>
                    <input
                      value={newTipoData.descripcion}
                      onChange={e => setNewTipoData({ ...newTipoData, descripcion: e.target.value })}
                      placeholder="Nombre de la condición"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activo</span>
                    <Switch checked={newTipoData.activo} onChange={(v) => setNewTipoData({ ...newTipoData, activo: v })} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveTipoInline}
                      disabled={savingTipo}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {savingTipo ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsAddingTipo(false)}
                      className="px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingMaster ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs font-medium uppercase tracking-widest">Cargando...</span>
              </div>
            ) : tiposCondicion.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTipoId(t.id)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-2xl group relative",
                  selectedTipoId === t.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    selectedTipoId === t.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    <span className="text-xs font-black uppercase text-center leading-none">{t.codigo.slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedTipoId === t.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {t.descripcion}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                        CÓDIGO: {t.codigo}
                      </span>
                      {t._count?.condiciones !== undefined && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                            {t._count.condiciones} {t._count.condiciones === 1 ? 'valor' : 'valores'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-lg group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </div>
              </button>
            ))}
          </div>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-10">
          {selectedTipo ? (
            <div className="max-w-5xl mx-auto space-y-10">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {selectedTipo.descripcion}
                    </h2>
                    <Badge variant={selectedTipo.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selectedTipo.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {permisos.editar && (
                    <button
                      onClick={() => handleOpenTipoModal(selectedTipo)}
                      className="h-10 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Editar Tipo
                    </button>
                  )}
                  {permisos.crear && (
                    <button
                      onClick={handleCreateCondicionInline}
                      className="h-10 px-5 rounded-2xl bg-slate-950 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black transition-all shadow-xl active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Nuevo Valor
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Creation Card */}
              {isAddingCondicion && (
                <div className="bg-white dark:bg-slate-900 border-2 border-primary/20 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">add_circle</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Nuevo Valor de Condición</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración inline</p>
                      </div>
                    </div>
                    <button onClick={() => setIsAddingCondicion(false)} className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aplicar a</label>
                          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-[18px]">
                            <button
                              onClick={() => setNewCondicionData({ ...newCondicionData, material_id: null })}
                              className={cn(
                                "px-4 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all",
                                newCondicionData.material_id === null
                                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600"
                                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              )}
                            >
                              General
                            </button>
                            <button
                              onClick={() => setNewCondicionData({ ...newCondicionData, material_id: 0 })}
                              className={cn(
                                "px-4 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all",
                                newCondicionData.material_id !== null
                                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600"
                                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              )}
                            >
                              Material
                            </button>
                          </div>
                        </div>

                        {!newCondicionData.porcentaje && (
                          <div className="space-y-3 animate-in fade-in duration-300">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                            <MonedaSelect
                              value={newCondicionData.moneda_id}
                              onChange={m => setNewCondicionData({ ...newCondicionData, moneda_id: m?.id || defaultMonedaId })}
                            />
                          </div>
                        )}
                      </div>

                      {newCondicionData.material_id !== null && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Material</label>
                          <MaterialSelect
                            selectedLabel={newCondicionData.material?.descripcion}
                            onSelect={(m) => setNewCondicionData({ 
                              ...newCondicionData, 
                              material_id: m.id,
                              material: { descripcion: m.descripcion, codigo: m.codigo }
                            })}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido Desde</label>
                          <input
                            type="date"
                            value={newCondicionData.fecha_desde}
                            onChange={e => setNewCondicionData({ ...newCondicionData, fecha_desde: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido Hasta</label>
                          <input
                            type="date"
                            value={newCondicionData.fecha_hasta || ''}
                            onChange={e => setNewCondicionData({ ...newCondicionData, fecha_hasta: e.target.value || null })}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor / Configuración</label>
                        <div className="flex items-center gap-3">
                          {/* Segmented control for Type */}
                          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-[18px] shrink-0">
                            <button
                              onClick={() => setNewCondicionData({ ...newCondicionData, porcentaje: false, moneda_id: defaultMonedaId })}
                              className={cn(
                                "px-3 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all",
                                !newCondicionData.porcentaje
                                  ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600"
                                  : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              $
                            </button>
                            <button
                              onClick={() => setNewCondicionData({ ...newCondicionData, porcentaje: true })}
                              className={cn(
                                "px-3 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all",
                                newCondicionData.porcentaje
                                  ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600"
                                  : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              %
                            </button>
                          </div>
                          <div className="relative flex-1">
                             <input
                              type="number"
                              value={newCondicionData.valor}
                              onChange={e => setNewCondicionData({ ...newCondicionData, valor: Number(e.target.value) })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Activo</span>
                        <Switch checked={newCondicionData.activo} onChange={v => setNewCondicionData({ ...newCondicionData, activo: v })} />
                      </div>

                      <div className="flex gap-4 pt-2">
                        <button
                          onClick={handleSaveCondicionInline}
                          disabled={savingCondicion}
                          className="flex-1 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl h-12 text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {savingCondicion && <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>}
                          Guardar Nuevo Valor
                        </button>
                        <button
                          onClick={() => setIsAddingCondicion(false)}
                          className="px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditions List */}
              <div className="space-y-6">
                {loadingDetail ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Calculando valores...</span>
                  </div>
                ) : condiciones.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {condiciones.map((c) => (
                      <div key={c.id} className="flex flex-col gap-2">
                        <div className={cn(
                          "group p-4 bg-blue-50/30 dark:bg-slate-900/40 border-2 rounded-3xl flex items-center justify-between hover:border-primary/40 transition-all shadow-sm",
                          expandedId === c.id ? "border-primary/50 bg-white dark:bg-slate-900 shadow-xl" : "border-blue-100/50 dark:border-slate-800"
                        )}>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "size-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                              c.porcentaje ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                            )}>
                              <span className="text-xs font-black">{c.porcentaje ? '%' : c.moneda?.simbolo || '$'}</span>
                            </div>
                            <div className="truncate">
                              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight truncate leading-none mb-1">
                                {c.material_id === null ? 'GENERAL' : (c.material?.descripcion || 'MATERIAL NO IDENTIFICADO')}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {c.material?.codigo && `REF: ${c.material.codigo} • `} 
                                {mounted ? new Date(c.fecha_desde).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--'}
                                {c.fecha_hasta && mounted && ` - ${new Date(c.fecha_hasta).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className={cn(
                                "text-sm font-black tracking-tight",
                                c.porcentaje ? "text-orange-500" : "text-blue-600"
                              )}>
                                {c.porcentaje ? '' : c.moneda?.simbolo} {Number(c.valor).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                {c.porcentaje && '%'}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                if (expandedId === c.id) {
                                  setExpandedId(null);
                                  setEditingData(null);
                                } else {
                                  setExpandedId(c.id!);
                                  setEditingData({ ...c });
                                }
                              }}
                              className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all",
                                expandedId === c.id ? "bg-primary text-white rotate-180" : "text-slate-300 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              )}
                            >
                              <span className="material-symbols-outlined font-variation-icon">expand_more</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Expandable Edit Card */}
                        {expandedId === c.id && editingData && (
                          <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-top-4 duration-300 mx-4 -mt-2 z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido Desde</label>
                                    <input
                                      type="date"
                                      value={editingData.fecha_desde.split('T')[0]}
                                      onChange={e => setEditingData({ ...editingData, fecha_desde: e.target.value })}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary/50 outline-none transition-all"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido Hasta</label>
                                    <input
                                      type="date"
                                      value={editingData.fecha_hasta?.split('T')[0] || ''}
                                      onChange={e => setEditingData({ ...editingData, fecha_hasta: e.target.value || null })}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary/50 outline-none transition-all"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aplicar a</label>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingData({ ...editingData, material_id: null })}
                                      className={cn(
                                        "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                                        editingData.material_id === null
                                          ? "bg-primary/5 border-primary/50 text-primary"
                                          : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                                      )}
                                    >
                                      General
                                    </button>
                                    <button
                                      onClick={() => setEditingData({ ...editingData, material_id: editingData.material_id || 0 })}
                                      className={cn(
                                        "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                                        editingData.material_id !== null
                                          ? "bg-primary/5 border-primary/50 text-primary"
                                          : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                                      )}
                                    >
                                      Material
                                    </button>
                                  </div>
                                </div>

                                {editingData.material_id !== null && (
                                  <div className="space-y-2">
                                    <MaterialSelect
                                      selectedLabel={editingData.material?.descripcion}
                                      onSelect={(m) => setEditingData({
                                        ...editingData,
                                        material_id: m.id,
                                        material: { descripcion: m.descripcion, codigo: m.codigo }
                                      })}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor / Configuración</label>
                                  <div className="flex gap-3">
                                    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                                      <button
                                        onClick={() => setEditingData({ ...editingData, porcentaje: false, moneda_id: defaultMonedaId })}
                                        className={cn(
                                          "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                          !editingData.porcentaje ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                                        )}
                                      >
                                        $
                                      </button>
                                      <button
                                        onClick={() => setEditingData({ ...editingData, porcentaje: true })}
                                        className={cn(
                                          "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                          editingData.porcentaje ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm" : "text-slate-400"
                                        )}
                                      >
                                        %
                                      </button>
                                    </div>
                                    <input
                                      type="number"
                                      value={editingData.valor}
                                      onChange={e => setEditingData({ ...editingData, valor: Number(e.target.value) })}
                                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-black focus:border-primary/50 outline-none transition-all"
                                    />
                                  </div>
                                </div>

                                {!editingData.porcentaje && (
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                                    <MonedaSelect
                                      value={editingData.moneda_id}
                                      onChange={(m) => setEditingData({
                                        ...editingData,
                                        moneda_id: m?.id || defaultMonedaId,
                                        moneda: m ? { simbolo: m.simbolo, abreviatura: m.abreviatura } : undefined
                                      })}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Activo</span>
                                  <Switch checked={editingData.activo} onChange={v => setEditingData({ ...editingData, activo: v })} />
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => handleSaveCondicion(editingData)}
                                    disabled={savingCondicion}
                                    className="flex-1 h-10 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                  >
                                    {savingCondicion && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                    Actualizar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedId(null)
                                      setEditingData(null)
                                    }}
                                    className="px-4 h-10 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-black transition-colors"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="size-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <span className="material-symbols-outlined text-3xl">sell</span>
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic leading-none mb-4">No hay valores configurados</p>
                    {permisos.crear && (
                      <button
                        onClick={() => handleOpenCondicionModal()}
                        className="text-xs font-black text-primary hover:underline underline-offset-4"
                      >
                        + DEFINIR PRIMER VALOR
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20">rule</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Seleccione una Condición</p>
                <p className="text-xs font-medium text-slate-400 italic">Para visualizar y gestionar sus reglas y valores vigentes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Condicion Modal */}
      <CrudModal
        open={condicionModalOpen}
        onClose={() => setCondicionModalOpen(false)}
        title={editingCondicion?.id ? 'Editar Valor de Condición' : 'Nuevo Valor de Condición'}
        size="md"
      >
        {editingCondicion && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aplicar a</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingCondicion({ ...editingCondicion, material_id: null })}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      editingCondicion.material_id === null
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    )}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setEditingCondicion({ ...editingCondicion, material_id: editingCondicion.material_id || 0 })}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      editingCondicion.material_id !== null
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    )}
                  >
                    Material
                  </button>
                </div>
              </div>

              {!editingCondicion.porcentaje && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                  <MonedaSelect
                    value={editingCondicion.moneda_id}
                    onChange={(m) => setEditingCondicion({
                      ...editingCondicion,
                      moneda_id: m?.id || defaultMonedaId,
                      moneda: m ? { simbolo: m.simbolo, abreviatura: m.abreviatura } : undefined
                    })}
                  />
                </div>
              )}
            </div>

            {editingCondicion.material_id !== null && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Material</label>
                <MaterialSelect
                  selectedLabel={editingCondicion.material?.descripcion}
                  onSelect={(m) => setEditingCondicion({
                    ...editingCondicion,
                    material_id: m.id,
                    material: { descripcion: m.descripcion, codigo: m.codigo }
                  })}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Valor / Tipo</label>
              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                  <button
                    onClick={() => setEditingCondicion({ ...editingCondicion, porcentaje: false, moneda_id: defaultMonedaId })}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                      !editingCondicion.porcentaje ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    $
                  </button>
                  <button
                    onClick={() => setEditingCondicion({ ...editingCondicion, porcentaje: true })}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                      editingCondicion.porcentaje ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm" : "text-slate-400"
                    )}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  value={editingCondicion.valor}
                  onChange={(e) => setEditingCondicion({ ...editingCondicion, valor: Number(e.target.value) })}
                  className="flex-1 h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido desde</label>
                <input
                  type="date"
                  value={editingCondicion.fecha_desde}
                  onChange={(e) => setEditingCondicion({ ...editingCondicion, fecha_desde: e.target.value })}
                  className="w-full h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Válido hasta</label>
                <input
                  type="date"
                  value={editingCondicion.fecha_hasta || ''}
                  onChange={(e) => setEditingCondicion({ ...editingCondicion, fecha_hasta: e.target.value || null })}
                  className="w-full h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium placeholder:italic"
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado activo</span>
              <Switch
                checked={editingCondicion.activo}
                onChange={(c) => setEditingCondicion({ ...editingCondicion, activo: c })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setCondicionModalOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveCondicion()}
                disabled={savingCondicion}
                className="flex-1 h-12 rounded-2xl bg-slate-950 text-white text-sm font-black transition-all active:scale-95 shadow-xl disabled:opacity-50"
              >
                {savingCondicion ? 'Guardando...' : 'Guardar valor'}
              </button>
            </div>
          </div>
        )}
      </CrudModal>

      {/* Tipo Modal */}
      <CrudModal
        open={tipoModalOpen}
        onClose={() => setTipoModalOpen(false)}
        title={editingTipo?.id ? 'Editar Definición' : 'Nueva Definición'}
        size="md"
      >
        {editingTipo && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código</label>
                <input
                  type="text"
                  value={editingTipo.codigo}
                  onChange={(e) => setEditingTipo({ ...editingTipo, codigo: e.target.value })}
                  disabled={!!editingTipo?.id}
                  placeholder="Ej: LPRC"
                  className={cn(
                    "w-full h-11 px-5 border rounded-2xl outline-none text-sm font-black uppercase",
                    editingTipo?.id
                      ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                <div className="h-11 flex items-center px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Switch
                    checked={editingTipo.activo}
                    onChange={(c) => setEditingTipo({ ...editingTipo, activo: c })}
                  />
                  <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activo</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Nombre</label>
              <input
                type="text"
                value={editingTipo.descripcion}
                onChange={(e) => setEditingTipo({ ...editingTipo, descripcion: e.target.value })}
                placeholder="Ej: Lista de precios minorista"
                className="w-full h-11 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setTipoModalOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTipo}
                disabled={savingTipo}
                className="flex-1 h-12 rounded-2xl bg-slate-950 text-white text-sm font-black transition-all active:scale-95 shadow-xl disabled:opacity-50"
              >
                {savingTipo ? 'Guardando...' : 'Guardar definición'}
              </button>
            </div>
          </div>
        )}
      </CrudModal>
    </div>
  )
}
