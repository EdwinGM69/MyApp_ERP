'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import CrudModal from '@/components/ui/CrudModal'
import toast from 'react-hot-toast'

interface TipoOperacion {
  id: number
  codigo: string
  descripcion: string
  categoria: string
  afecta_stock: boolean
  signo_origen: string | null
  signo_destino: string | null
  requiere_proveedor: boolean
  requiere_cliente: boolean
  requiere_suc_destino: boolean
  permite_precio_costo: boolean
  actualiza_costo: boolean
  requiere_aprobacion: boolean
  requiere_pedido?: boolean
  estado_stock_id?: number | null
  activo: boolean
}

export default function TiposOperacionPage() {
  // Master List
  const [tipos, setTipos] = useState<TipoOperacion[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<TipoOperacion | null>(null)

  // Editor State (Inline)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Auxiliary Data
  const [estadosStock, setEstadosStock] = useState<any[]>([])

  // Fetch List
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/logistica/tipos-operacion?search=${search}`)
      const json = await res.json()
      setTipos(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar tipos de operación')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const res = await apiFetch('/api/logistica/estados-stock')
        const json = await res.json()
        setEstadosStock(json.data || [])
      } catch (err) {
        console.error('Error fetching aux data')
      }
    }
    fetchAux()
  }, [])

  useEffect(() => {
    if (selectedId) {
      setSelected(tipos.find(t => t.id === selectedId) || null)
    }
  }, [selectedId, tipos])

  const handleOpenEditor = (t?: any) => {
    setEditingData(t || {
      codigo: '', descripcion: '', categoria: 'VENTA', afecta_stock: true,
      signo_origen: '-', signo_destino: '+', requiere_proveedor: false,
      requiere_cliente: true, requiere_suc_destino: false, permite_precio_costo: false,
      actualiza_costo: false, requiere_aprobacion: false, requiere_pedido: false,
      estado_stock_id: null, activo: true
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return
    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/logistica/tipos-operacion', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingData)
      })
      if (res.ok) {
        toast.success(isNew ? 'Tipo creado' : 'Tipo actualizado')
        setIsEditing(false)
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

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Tipos de Operación" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Listado Maestro</h3>
              <button
                onClick={() => {
                  setSelectedId(null);
                  handleOpenEditor();
                }}
                className="size-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar tipo..."
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
            ) : tipos.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-2xl group relative",
                  selectedId === t.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors font-black text-xs",
                    selectedId === t.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {t.codigo.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === t.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {t.descripcion}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      CÓDIGO: {t.codigo}
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
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Configuración Maestra de Flujo Operativo</p>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="size-11 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Único</label>
                    <input
                      type="text"
                      value={editingData.codigo}
                      onChange={(e) => setEditingData({ ...editingData, codigo: e.target.value })}
                      placeholder="Ej: FACV"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-black uppercase bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción de la Operación</label>
                  <input
                    type="text"
                    value={editingData.descripcion}
                    onChange={(e) => setEditingData({ ...editingData, descripcion: e.target.value })}
                    placeholder="Ej: Factura de Venta Directa"
                    className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">LÓGICA DE NEGOCIO</p>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoría General</label>
                        <select
                          value={editingData.categoria}
                          onChange={(e) => setEditingData({ ...editingData, categoria: e.target.value })}
                          className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                        >
                          <option value="VENTA">VENTA</option>
                          <option value="COMPRA">COMPRA</option>
                          <option value="TRASLADO">TRASLADO</option>
                          <option value="AJUSTE">AJUSTE</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado de Stock</label>
                        <select
                          value={editingData.estado_stock_id || ''}
                          onChange={(e) => setEditingData({ ...editingData, estado_stock_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                        >
                          <option value="">(SIN ESTADO)</option>
                          {estadosStock.map(est => (
                            <option key={est.id} value={est.id}>{est.descripcion}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        {/* Signo Origen */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Signo Origen</label>
                          <div className="flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = editingData.signo_origen === '+' ? null : '+'
                                setEditingData({ ...editingData, signo_origen: newVal })
                              }}
                              className={cn(
                                "flex items-center gap-3 h-14 px-5 rounded-2xl border-2 transition-all group",
                                editingData.signo_origen === '+'
                                  ? "bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm"
                                  : "bg-slate-50/40 border-slate-100 text-slate-400 hover:border-slate-200"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-2xl transition-colors",
                                editingData.signo_origen === '+' ? "text-blue-500" : "text-slate-400"
                              )}>add_circle</span>
                              <span className="text-[11px] font-black uppercase tracking-tight">+ SUMA (+)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = editingData.signo_origen === '-' ? null : '-'
                                setEditingData({ ...editingData, signo_origen: newVal })
                              }}
                              className={cn(
                                "flex items-center gap-3 h-14 px-5 rounded-2xl border-2 transition-all group",
                                editingData.signo_origen === '-'
                                  ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                  : "bg-slate-50/40 border-slate-100 text-slate-400 hover:border-slate-200"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-2xl transition-colors",
                                editingData.signo_origen === '-' ? "text-white" : "text-slate-400"
                              )}>remove_circle</span>
                              <span className="text-[11px] font-black uppercase tracking-tight">- RESTA (-)</span>
                            </button>
                          </div>
                        </div>

                        {/* Signo Destino */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Signo Destino</label>
                          <div className="flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = editingData.signo_destino === '-' ? null : '-'
                                setEditingData({ ...editingData, signo_destino: newVal })
                              }}
                              className={cn(
                                "flex items-center gap-3 h-14 px-5 rounded-2xl border-2 transition-all group",
                                editingData.signo_destino === '-'
                                  ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                  : "bg-slate-50/40 border-slate-100 text-slate-400 hover:border-slate-200"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-2xl transition-colors",
                                editingData.signo_destino === '-' ? "text-white" : "text-slate-400"
                              )}>remove_circle</span>
                              <span className="text-[11px] font-black uppercase tracking-tight">- RESTA (-)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = editingData.signo_destino === '+' ? null : '+'
                                setEditingData({ ...editingData, signo_destino: newVal })
                              }}
                              className={cn(
                                "flex items-center gap-3 h-14 px-5 rounded-2xl border-2 transition-all group",
                                editingData.signo_destino === '+'
                                  ? "bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm"
                                  : "bg-slate-50/40 border-slate-100 text-slate-400 hover:border-slate-200"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-2xl transition-colors",
                                editingData.signo_destino === '+' ? "text-blue-500" : "text-slate-400"
                              )}>add_circle</span>
                              <span className="text-[11px] font-black uppercase tracking-tight">+ SUMA (+)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">PARÁMETROS DEL SISTEMA</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'Afecta Stock', key: 'afecta_stock' },
                        { label: 'Requiere Cliente', key: 'requiere_cliente' },
                        { label: 'Requiere Proveedor', key: 'requiere_proveedor' },
                        { label: 'Requiere Sucursal Destino', key: 'requiere_suc_destino' },
                        { label: 'Requiere N° Pedido', key: 'requiere_pedido' },
                        { label: 'Requiere Aprobación', key: 'requiere_aprobacion' },
                        { label: 'Solicita Precio de Costo', key: 'permite_precio_costo' },
                        { label: 'Actualiza Costo', key: 'actualiza_costo' },
                      ].map((f) => (
                        <div key={f.key} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{f.label}</span>
                          <Switch
                            checked={(editingData as any)[f.key]}
                            onChange={(c) => setEditingData({ ...editingData, [f.key]: c })}
                          />
                        </div>
                      ))}
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
          ) : selected ? (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                      {selected.descripcion}
                    </h2>
                    <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selected.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm font-medium tracking-tight">
                    Definición de Operación Logística · Código Maestro: {selected.codigo}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditor(selected)}
                    className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Editar Configuración
                  </button>
                </div>
              </div>

              {/* Data Grid */}
              <div className="space-y-12">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">PARÁMETROS DE INVENTARIO</p>
                    <div className="grid grid-cols-1 gap-6">
                      <div className={cn(
                        "p-6 rounded-3xl border transition-all",
                        selected.afecta_stock
                          ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ring-1 ring-blue-50 dark:ring-blue-900/20"
                          : "bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800"
                      )}>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest block mb-4",
                          selected.afecta_stock ? "text-blue-500" : "text-slate-400"
                        )}>FLUJO DE STOCK REAL</span>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">Impacto en Kárdex</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Determina si esta operación genera movimientos de entrada o salida física.</p>
                          </div>
                          <Badge variant={selected.afecta_stock ? 'info' : 'neutral'} className="font-black h-8 px-4 text-xs">
                            {selected.afecta_stock ? 'SÍ' : 'NO'}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">COMPORTAMIENTO ARITMÉTICO</span>
                        <div className="flex gap-4">
                          <div className="flex-1 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ORIGEN</span>
                            <span className={cn("text-3xl font-black", selected.signo_origen === '+' ? "text-green-500" : selected.signo_origen === '-' ? "text-red-500" : "text-slate-300")}>
                              {selected.signo_origen}
                            </span>
                          </div>
                          <div className="flex-1 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">DESTINO</span>
                            <span className={cn("text-3xl font-black", selected.signo_destino === '+' ? "text-green-500" : selected.signo_destino === '-' ? "text-red-500" : "text-slate-300")}>
                              {selected.signo_destino}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">VALIDACIONES Y REQUISITOS</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Requiere Proveedor / Entidad', val: selected.requiere_proveedor, icon: 'factory' },
                        { label: 'Requiere Cliente / Tercero', val: selected.requiere_cliente, icon: 'person' },
                        { label: 'Requiere Sucursal Destino', val: selected.requiere_suc_destino, icon: 'store' },
                        { label: 'Requiere Pedido u Orden', val: selected.requiere_pedido, icon: 'description' },
                        { label: 'Requiere Autorización', val: selected.requiere_aprobacion, icon: 'verified_user' },
                        { label: 'Solicita Precio de Costo', val: selected.permite_precio_costo, icon: 'payments' },
                        { label: 'Actualiza Costo', val: selected.actualiza_costo, icon: 'published_with_changes' },
                      ].map((req) => (
                        <div key={req.label} className="flex items-center justify-between py-2.5 px-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
                          <div className="flex items-center gap-3">
                            <span className={cn("material-symbols-outlined text-xl", req.val ? "text-primary" : "text-slate-300 text-lg")}>{req.icon}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{req.label}</span>
                          </div>
                          <span className={cn(
                            "material-symbols-outlined text-2xl",
                            req.val ? "text-primary fill-1" : "text-slate-200 dark:text-slate-800"
                          )}>
                            {req.val ? 'check_circle' : 'circle'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">settings_input_component</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Configuración Central</p>
                <p className="text-xs font-medium text-slate-400 italic">Selecciona un tipo de operación para visualizar sus reglas de negocio.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
