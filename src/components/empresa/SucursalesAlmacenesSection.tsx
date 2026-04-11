'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Almacen {
  id: number
  descripcion: string
}

interface SucursalAlmacen {
  id: number
  sucursal_id: number
  almacen_id: number
  rol: string
  verificar_disponibilidad: boolean
  almacen: Almacen
}

interface Caja {
  id: number
  codigo: string
  descripcion: string
}

interface SucursalCaja {
  id: number
  sucursal_id: number
  caja_id: number
  activo: boolean
  caja: Caja
}

interface Sucursal {
  id: number
  descripcion: string
  direccion?: string
  departamento?: string
  provincia?: string
  distrito?: string
  activo: boolean
  almacenes_vinculados: SucursalAlmacen[]
  cajas_vinculadas: SucursalCaja[]
}

export default function SucursalesAlmacenesSection() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [almacenesDisponibles, setAlmacenesDisponibles] = useState<Almacen[]>([])
  const [cajasDisponibles, setCajasDisponibles] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeTabs, setActiveTabs] = useState<{ [key: number]: 'generales' | 'almacenes' | 'cajas' }>({})
  
  // New Sucursal State
  const [showAddSucursal, setShowAddSucursal] = useState(false)
  const [newSucursal, setNewSucursal] = useState({
    descripcion: '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    activo: true
  })

  // Association State (per sucursal)
  const [associationData, setAssociationData] = useState<{ [key: number]: { almacen_id: string, rol: string, verificar_disponibilidad: boolean } }>({})
  const [associationCajaData, setAssociationCajaData] = useState<{ [key: number]: { caja_id: string, activo: boolean } }>({})

  const fetchData = async () => {
    try {
      const [resSuc, resAlm, resCaj] = await Promise.all([
        apiFetch('/api/empresa/sucursales'),
        apiFetch('/api/logistica/almacenes?limit=100'),
        apiFetch('/api/tesoreria/cajas')
      ])
      
      if (!resSuc.ok) {
        const errJson = await resSuc.json().catch(() => ({}))
        throw new Error(`Error sucursales: ${errJson.error || resSuc.statusText}`)
      }
      if (!resAlm.ok) {
        const errJson = await resAlm.json().catch(() => ({}))
        throw new Error(`Error almacenes: ${errJson.error || resAlm.statusText}`)
      }
      if (!resCaj.ok) {
        const errJson = await resCaj.json().catch(() => ({}))
        throw new Error(`Error cajas: ${errJson.error || resCaj.statusText}`)
      }
      
      const sucursalesData = await resSuc.json()
      const almacenesData = await resAlm.json()
      const cajasData = await resCaj.json()
      
      setSucursales(sucursalesData)
      setAlmacenesDisponibles(almacenesData.data || [])
      setCajasDisponibles(cajasData.data || [])
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateSucursal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/empresa/sucursales', {
        method: 'POST',
        body: JSON.stringify(newSucursal)
      })
      if (!res.ok) throw new Error('Error al crear sucursal')
      toast.success('Sucursal creada')
      setShowAddSucursal(false)
      setNewSucursal({ descripcion: '', direccion: '', departamento: '', provincia: '', distrito: '', activo: true })
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleUpdateSucursal = async (sucursal: Sucursal) => {
    try {
      const res = await apiFetch('/api/empresa/sucursales', {
        method: 'PUT',
        body: JSON.stringify(sucursal)
      })
      if (!res.ok) throw new Error('Error al actualizar sucursal')
      toast.success('Sucursal actualizada')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleAssociateAlmacen = async (sucursalId: number) => {
    const data = associationData[sucursalId]
    if (!data?.almacen_id) {
      toast.error('Seleccione un almacén')
      return
    }

    try {
      const res = await apiFetch('/api/empresa/sucursales/almacenes', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursalId,
          almacen_id: Number(data.almacen_id),
          rol: data.rol || 'secundario',
          verificar_disponibilidad: data.verificar_disponibilidad ?? true
        })
      })
      if (!res.ok) throw new Error('Error al vincular almacén')
      toast.success('Almacén vinculado')
      setAssociationData(prev => ({ ...prev, [sucursalId]: { almacen_id: '', rol: 'secundario', verificar_disponibilidad: true } }))
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveAssociation = async (associationId: number) => {
    try {
      const res = await apiFetch(`/api/empresa/sucursales/almacenes?id=${associationId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al desvincular almacén')
      toast.success('Almacén desvínculado')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleAssociateCaja = async (sucursalId: number) => {
    const data = associationCajaData[sucursalId]
    if (!data?.caja_id) {
      toast.error('Seleccione una caja')
      return
    }

    try {
      const res = await apiFetch('/api/empresa/sucursales/cajas', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursalId,
          caja_id: Number(data.caja_id),
          activo: data.activo ?? true
        })
      })
      if (!res.ok) throw new Error('Error al vincular caja')
      toast.success('Caja vinculada')
      setAssociationCajaData(prev => ({ ...prev, [sucursalId]: { caja_id: '', activo: true } }))
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveCajaAssociation = async (associationId: number) => {
    try {
      const res = await apiFetch(`/api/empresa/sucursales/cajas?id=${associationId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al desvincular caja')
      toast.success('Caja desvínculada')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) return null

  const totalAlmacenesVinculados = sucursales.reduce((acc, s) => acc + s.almacenes_vinculados.length, 0)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all overflow-hidden mt-8">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1.5">Sucursales y almacenes</h3>
            <p className="text-[11px] text-slate-500 font-medium tracking-tight">
              {sucursales.length} sucursales · {totalAlmacenesVinculados} almacenes vinculados
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddSucursal(true)}
          className="px-5 h-10 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Añadir sucursal
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* New Sucursal Form */}
        {showAddSucursal && (
          <div className="p-8 bg-blue-50/30 dark:bg-blue-500/5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-500/20 mb-8">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add_business</span>
              Nueva Sucursal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Nombre</label>
                <input
                  type="text"
                  value={newSucursal.descripcion}
                  onChange={e => setNewSucursal(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-inter"
                  placeholder="Ej: Sucursal Norte"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Dirección</label>
                <input
                  type="text"
                  value={newSucursal.direccion}
                  onChange={e => setNewSucursal(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-inter"
                  placeholder="Calle 123..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Departamento</label>
                <input
                  type="text"
                  value={newSucursal.departamento}
                  onChange={e => setNewSucursal(prev => ({ ...prev, departamento: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-inter"
                  placeholder="Ej: Lima"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Provincia</label>
                <input
                  type="text"
                  value={newSucursal.provincia}
                  onChange={e => setNewSucursal(prev => ({ ...prev, provincia: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-inter"
                  placeholder="Ej: Lima"
                />
              </div>

              {/* Row 2 */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Distrito</label>
                <input
                  type="text"
                  value={newSucursal.distrito}
                  onChange={e => setNewSucursal(prev => ({ ...prev, distrito: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-inter"
                  placeholder="Ej: Miraflores"
                />
              </div>
              <div className="space-y-1 flex flex-col items-start min-w-[100px]">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Estado</label>
                <div className="flex items-center gap-2 h-7.5 px-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setNewSucursal(prev => ({ ...prev, activo: !prev.activo }))}
                    className={cn(
                      "h-6 w-11 rounded-full relative transition-all duration-300 flex items-center px-1 shadow-inner",
                      newSucursal.activo ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "size-4 rounded-full bg-white shadow-md transition-all duration-300 transform",
                      newSucursal.activo ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-500 w-12">
                    {newSucursal.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="lg:col-span-2 flex items-end gap-3 pb-0.5">
                <button
                  type="button"
                  onClick={handleCreateSucursal}
                  className="w-full sm:w-auto px-8 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSucursal(false)}
                  className="w-full sm:w-auto px-8 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sucursales List */}
        <div className="space-y-4">
          {sucursales.map((sucursal, idx) => (
            <div 
              key={sucursal.id}
              className={cn(
                "group border rounded-2xl transition-all duration-300",
                expandedId === sucursal.id 
                  ? "border-blue-200 dark:border-blue-500/30 bg-white dark:bg-slate-800 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/10" 
                  : "border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 bg-slate-50/30 dark:bg-slate-900/10"
              )}
            >
              {/* Card Header (Clickable to Expand) */}
              <div 
                onClick={() => setExpandedId(expandedId === sucursal.id ? null : sucursal.id)}
                className="px-6 py-5 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "size-9 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                    expandedId === sucursal.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 rotate-3" 
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-105"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-[15px] font-black text-slate-800 dark:text-white tracking-tight">{sucursal.descripcion}</h4>
                      {sucursal.almacenes_vinculados.map(v => (
                        <span key={v.id} className="hidden sm:inline-block px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                          {v.almacen.descripcion}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                      {sucursal.direccion ? `${sucursal.direccion} · ` : ''}{sucursal.distrito || 'No especificado'}, {sucursal.provincia || 'No especificado'}, {sucursal.departamento || 'No especificado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "size-8 rounded-lg flex items-center justify-center border transition-all",
                     expandedId === sucursal.id ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-400"
                   )}>
                    <span className={cn("material-symbols-outlined text-xl transition-transform duration-300", expandedId === sucursal.id && "rotate-180")}>
                      expand_more
                    </span>
                   </div>
                </div>
              </div>

              {/* Card Body (Collapsed Content) */}
              {expandedId === sucursal.id && (
                <div className="px-8 pb-8 pt-4 border-t border-slate-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-4 duration-500">
                  
                  {/* Tabs Header */}
                  <div className="flex items-center gap-1 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                    {[
                      { id: 'generales', label: 'Datos Generales', icon: 'info' },
                      { id: 'almacenes', label: 'Almacenes Asociados', icon: 'inventory_2' },
                      { id: 'cajas', label: 'Cajas Asociadas', icon: 'point_of_sale' }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTabs(prev => ({ ...prev, [sucursal.id]: tab.id as any }))}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          (activeTabs[sucursal.id] || 'generales') === tab.id 
                            ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        )}
                      >
                        <span className="material-symbols-outlined text-base">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[300px]">
                    
                    {/* Tab 1: Datos Generales */}
                    {(activeTabs[sucursal.id] || 'generales') === 'generales' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                            <input
                              type="text"
                              value={sucursal.descripcion}
                              onChange={e => {
                                const newSucursales = [...sucursales]
                                newSucursales[idx].descripcion = e.target.value
                                setSucursales(newSucursales)
                              }}
                              onBlur={() => handleUpdateSucursal(sucursal)}
                              className="w-full px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-800 dark:text-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                            <input
                              type="text"
                              value={sucursal.direccion || ''}
                              onChange={e => {
                                const newSucursales = [...sucursales]
                                newSucursales[idx].direccion = e.target.value
                                setSucursales(newSucursales)
                              }}
                              onBlur={() => handleUpdateSucursal(sucursal)}
                              className="w-full px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                            <input
                              type="text"
                              value={sucursal.departamento || ''}
                              onChange={e => {
                                const newSucursales = [...sucursales]
                                newSucursales[idx].departamento = e.target.value
                                setSucursales(newSucursales)
                              }}
                              onBlur={() => handleUpdateSucursal(sucursal)}
                              className="w-full px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Provincia</label>
                            <input
                              type="text"
                              value={sucursal.provincia || ''}
                              onChange={e => {
                                const newSucursales = [...sucursales]
                                newSucursales[idx].provincia = e.target.value
                                setSucursales(newSucursales)
                              }}
                              onBlur={() => handleUpdateSucursal(sucursal)}
                              className="w-full px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distrito</label>
                            <input
                              type="text"
                              value={sucursal.distrito || ''}
                              onChange={e => {
                                const newSucursales = [...sucursales]
                                newSucursales[idx].distrito = e.target.value
                                setSucursales(newSucursales)
                              }}
                              onBlur={() => handleUpdateSucursal(sucursal)}
                              className="w-full px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col items-start min-w-[100px]">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                            <div className="flex items-center gap-3 h-10 px-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newStatus = !sucursal.activo
                                  const newSucursales = [...sucursales]
                                  newSucursales[idx].activo = newStatus
                                  setSucursales(newSucursales)
                                  handleUpdateSucursal(newSucursales[idx])
                                }}
                                className={cn(
                                  "h-7 w-12 rounded-full relative transition-all duration-300 flex items-center px-1 shadow-inner",
                                  sucursal.activo ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                                )}
                              >
                                <div className={cn(
                                  "size-5 rounded-full bg-white shadow-md transition-all duration-300 transform",
                                  sucursal.activo ? "translate-x-5" : "translate-x-0"
                                )} />
                              </button>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-14">
                                {sucursal.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Almacenes Asociados */}
                    {activeTabs[sucursal.id] === 'almacenes' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">Almacenes asociados ({sucursal.almacenes_vinculados.length})</h5>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left table-fixed border-collapse">
                            <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                              <tr>
                                <th className="pl-4 pr-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Almacén</th>
                                <th className="px-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-[20%]">Rol</th>
                                <th className="px-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-[20%]">V. STOCK</th>
                                <th className="pl-2 pr-4 py-3 text-center w-[20%]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {sucursal.almacenes_vinculados.map(v => (
                                <tr key={v.id} className="group/row hover:bg-white dark:hover:bg-slate-800 transition-all">
                                  <td className="pl-4 pr-2 py-3 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("size-2 shrink-0 rounded-full", v.rol === 'principal' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]')}></div>
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">ALM-{v.almacen.descripcion}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight",
                                      v.rol === 'principal' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                                    )}>
                                      {v.rol}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    {v.verificar_disponibilidad ? (
                                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-slate-300 text-lg">cancel</span>
                                    )}
                                  </td>
                                  <td className="pl-2 pr-4 py-3 text-center">
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveAssociation(v.id)}
                                      className="size-8 mx-auto rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {sucursal.almacenes_vinculados.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-5 py-8 text-center text-[10px] text-slate-400 font-medium tracking-tight">
                                    No hay almacenes vinculados a esta sucursal.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Add Warehouse Association */}
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-end gap-3 px-1">
                          <div className="flex-1 min-w-[140px] space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 leading-none">Almacén Disponible</label>
                            <select 
                              value={associationData[sucursal.id]?.almacen_id || ''}
                              onChange={e => setAssociationData(prev => ({ 
                                ...prev, 
                                [sucursal.id]: { ...prev[sucursal.id], almacen_id: e.target.value } 
                              }))}
                              className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                              <option value="">Seleccionar...</option>
                              {almacenesDisponibles
                                .filter(a => !sucursal.almacenes_vinculados.some(v => v.almacen_id === a.id))
                                .map(a => (
                                  <option key={a.id} value={a.id}>{a.descripcion}</option>
                                ))
                              }
                            </select>
                          </div>
                          <div className="w-28 space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 leading-none">Rol</label>
                            <select 
                              value={associationData[sucursal.id]?.rol || 'secundario'}
                              onChange={e => setAssociationData(prev => ({ 
                                ...prev, 
                                [sucursal.id]: { ...prev[sucursal.id], rol: e.target.value } 
                              }))}
                              className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                              <option value="principal">Principal</option>
                              <option value="secundario">Secundario</option>
                            </select>
                          </div>
                          <div className="flex flex-col mb-1 gap-1.5 min-w-[110px]">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 leading-none">Verificación stock</label>
                             <button
                               type="button"
                               onClick={() => setAssociationData(prev => ({ 
                                 ...prev, 
                                 [sucursal.id]: { ...prev[sucursal.id], verificar_disponibilidad: !(prev[sucursal.id]?.verificar_disponibilidad ?? true) } 
                               }))}
                               className={cn(
                                 "h-8 w-14 rounded-full relative transition-all duration-300 flex items-center px-1.5 shadow-inner",
                                 (associationData[sucursal.id]?.verificar_disponibilidad ?? true) ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                               )}
                             >
                                <div className={cn(
                                  "size-5 rounded-full bg-white shadow-md transition-all duration-300 transform",
                                  (associationData[sucursal.id]?.verificar_disponibilidad ?? true) ? "translate-x-6" : "translate-x-0"
                                )} />
                             </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssociateAlmacen(sucursal.id)}
                            className="px-6 h-12 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Asociar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Cajas Asociadas */}
                    {activeTabs[sucursal.id] === 'cajas' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">Cajas asociadas ({sucursal.cajas_vinculadas.length})</h5>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left table-fixed border-collapse">
                            <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                              <tr>
                                <th className="pl-4 pr-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Caja</th>
                                <th className="px-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-[20%]">Código</th>
                                <th className="px-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-[20%]">Estado</th>
                                <th className="pl-2 pr-4 py-3 text-center w-[20%]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {sucursal.cajas_vinculadas.map(v => (
                                <tr key={v.id} className="group/row hover:bg-white dark:hover:bg-slate-800 transition-all">
                                  <td className="pl-4 pr-2 py-3 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("size-2 shrink-0 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]")}></div>
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{v.caja.descripcion}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[8px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
                                      {v.caja.codigo}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    {v.activo ? (
                                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-slate-300 text-lg">cancel</span>
                                    )}
                                  </td>
                                  <td className="pl-2 pr-4 py-3 text-center">
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveCajaAssociation(v.id)}
                                      className="size-8 mx-auto rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {sucursal.cajas_vinculadas.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-5 py-8 text-center text-[10px] text-slate-400 font-medium tracking-tight">
                                    No hay cajas vinculadas a esta sucursal.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Add Caja Association */}
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-end gap-3 px-1">
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 leading-none">Caja Disponible</label>
                            <select 
                              value={associationCajaData[sucursal.id]?.caja_id || ''}
                              onChange={e => setAssociationCajaData(prev => ({ 
                                ...prev, 
                                [sucursal.id]: { ...prev[sucursal.id], caja_id: e.target.value } 
                              }))}
                              className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                              <option value="">Seleccionar caja...</option>
                              {cajasDisponibles
                                .filter(c => !sucursal.cajas_vinculadas.some(v => v.caja_id === c.id))
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.codigo} - {c.descripcion}</option>
                                ))
                              }
                            </select>
                          </div>
                          <div className="flex flex-col mb-1 gap-1.5 min-w-[110px]">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 leading-none">Vínculo Activo</label>
                             <button
                               type="button"
                               onClick={() => setAssociationCajaData(prev => ({ 
                                 ...prev, 
                                 [sucursal.id]: { ...prev[sucursal.id], activo: !(prev[sucursal.id]?.activo ?? true) } 
                               }))}
                               className={cn(
                                 "h-8 w-14 rounded-full relative transition-all duration-300 flex items-center px-1.5 shadow-inner",
                                 (associationCajaData[sucursal.id]?.activo ?? true) ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                               )}
                             >
                                <div className={cn(
                                  "size-5 rounded-full bg-white shadow-md transition-all duration-300 transform",
                                  (associationCajaData[sucursal.id]?.activo ?? true) ? "translate-x-6" : "translate-x-0"
                                )} />
                             </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssociateCaja(sucursal.id)}
                            className="px-6 h-12 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Asociar Caja
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
