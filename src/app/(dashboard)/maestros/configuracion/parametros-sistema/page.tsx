'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import CrudModal from '@/components/ui/CrudModal'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface ParametroSistema {
  id: number
  empresa_id?: number | null
  nivel: 'SISTEMA' | 'MODULO' | 'EMPRESA' | 'USUARIO'
  modulo_id: number
  codigo: string
  descripcion: string
  tipo_dato: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'JSON'
  valor_string?: string | null
  valor_number?: number | null
  valor_boolean?: boolean | null
  valor_date?: string | null
  valor_json?: any | null
  editable: boolean
  requiere_reinicio: boolean
  etiqueta: string
  activo: boolean
  modulo?: {
    id: number
    descripcion: string
  }
  empresa?: {
    id: number
    nombre: string
  } | null
}

export default function ParametrosSistemaPage() {
  const permisos = usePermisos()
  // Master List
  const [parametros, setParametros] = useState<ParametroSistema[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<ParametroSistema | null>(null)

  // Editor State (Inline)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Auxiliary Data
  const [modulos, setModulos] = useState<any[]>([])
  const empresaId = useAuthStore(state => state.user?.empresaId)

  // Fetch List
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/parametros-sistema?search=${search}`)
      const json = await res.json()
      setParametros(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar parámetros del sistema')
    } finally {
      setLoadingMaster(false)
    }
  }, [search, selectedId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Fetch modulos
  useEffect(() => {
    const fetchAux = async () => {
      try {
        const res = await apiFetch('/api/modulos')
        const json = await res.json()
        setModulos(json.data || [])
      } catch (err) {
        console.error('Error fetching modulos')
      }
    }
    fetchAux()
  }, [])

  useEffect(() => {
    if (selectedId) {
      setSelected(parametros.find(p => p.id === selectedId) || null)
    }
  }, [selectedId, parametros])

  const handleOpenEditor = (p?: any) => {
    setEditingData(p || {
      nivel: 'SISTEMA',
      modulo_id: 1,
      codigo: '',
      descripcion: '',
      tipo_dato: 'STRING',
      valor_string: null,
      valor_number: null,
      valor_boolean: null,
      valor_date: null,
      valor_json: null,
      editable: false,
      requiere_reinicio: false,
      etiqueta: '',
      activo: true,
      empresa_id: null
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return

    // Basic frontend validation
    if (!editingData.etiqueta?.trim()) {
      toast.error('La etiqueta es requerida')
      return
    }
    if (!editingData.codigo?.trim()) {
      toast.error('El código es requerido')
      return
    }
    if (!editingData.descripcion?.trim()) {
      toast.error('La descripción es requerida')
      return
    }

    setSaving(true)
    try {
      const isNew = !editingData.id
      const payload = {
        ...editingData,
        etiqueta: editingData.etiqueta || '',
        codigo: (editingData.codigo || '').toUpperCase(),
        descripcion: editingData.descripcion || ''
      }
      const res = await apiFetch('/api/parametros-sistema', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.success(isNew ? 'Parámetro creado' : 'Parámetro actualizado')
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
      <Topbar title="Parámetros del Sistema" />

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
                placeholder="Buscar parámetro..."
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
            ) : parametros.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full p-4 text-left transition-all rounded-2xl group relative",
                  selectedId === p.id
                    ? "bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700"
                    : "hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors font-black text-xs",
                    selectedId === p.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {p.etiqueta.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === p.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {p.etiqueta}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      {p.modulo?.descripcion} · {p.nivel}
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
                    {editingData.id ? 'Actualizar Parámetro' : 'Nuevo Parámetro'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Configuración del Sistema</p>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código</label>
                    <input
                      type="text"
                      value={editingData.codigo}
                      onChange={(e) => setEditingData({ ...editingData, codigo: e.target.value.toUpperCase() })}
                      disabled={!!editingData?.id}
                      placeholder="Ej: VENTAS.CLASEPEDIDO"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta (Tag para búsqueda rápida)</label>
                  <input
                    type="text"
                    value={editingData.etiqueta}
                    onChange={(e) => setEditingData({ ...editingData, etiqueta: e.target.value })}
                    placeholder="Ej: [IGV, ISC, ... ]"
                    className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción Técnica</label>
                  <textarea
                    value={editingData.descripcion}
                    onChange={(e) => setEditingData({ ...editingData, descripcion: e.target.value })}
                    placeholder="Descripción detallada del parámetro..."
                    rows={3}
                    className="w-full px-5 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel de Aplicación</label>
                    <select
                      value={editingData.nivel}
                      onChange={(e) => {
                        const newNivel = e.target.value
                        setEditingData({ 
                          ...editingData, 
                          nivel: newNivel,
                          empresa_id: (newNivel === 'EMPRESA' || newNivel === 'USUARIO') ? empresaId : null
                        })
                      }}
                      className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                    >
                      <option value="SISTEMA">SISTEMA</option>
                      <option value="MODULO">MÓDULO</option>
                      <option value="EMPRESA">EMPRESA</option>
                      <option value="USUARIO">USUARIO</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo</label>
                    <select
                      value={editingData.modulo_id}
                      onChange={(e) => setEditingData({ ...editingData, modulo_id: Number(e.target.value) })}
                      className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {modulos.map(mod => (
                        <option key={mod.id} value={mod.id}>{mod.descripcion}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Dato</label>
                    <select
                      value={editingData.tipo_dato}
                      onChange={(e) => setEditingData({ ...editingData, tipo_dato: e.target.value })}
                      className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                    >
                      <option value="STRING">TEXTO</option>
                      <option value="NUMBER">NÚMERO</option>
                      <option value="BOOLEAN">BOOLEANO</option>
                      <option value="DATE">FECHA</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>
                </div>

                {/* Valor field based on tipo_dato */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Predeterminado</label>
                  {editingData.tipo_dato === 'STRING' && (
                    <input
                      type="text"
                      value={editingData.valor_string || ''}
                      onChange={(e) => setEditingData({ ...editingData, valor_string: e.target.value })}
                      placeholder="Valor de texto..."
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  )}
                  {editingData.tipo_dato === 'NUMBER' && (
                    <input
                      type="number"
                      value={editingData.valor_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, valor_number: Number(e.target.value) })}
                      placeholder="Valor numérico..."
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  )}
                  {editingData.tipo_dato === 'BOOLEAN' && (
                    <div className="h-12 flex items-center">
                      <Switch
                        checked={editingData.valor_boolean || false}
                        onChange={(c) => setEditingData({ ...editingData, valor_boolean: c })}
                      />
                      <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Verdadero</span>
                    </div>
                  )}
                  {editingData.tipo_dato === 'DATE' && (
                    <input
                      type="date"
                      value={editingData.valor_date || ''}
                      onChange={(e) => setEditingData({ ...editingData, valor_date: e.target.value })}
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  )}
                  {editingData.tipo_dato === 'JSON' && (
                    <textarea
                      value={editingData.valor_json ? JSON.stringify(editingData.valor_json, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value)
                          setEditingData({ ...editingData, valor_json: parsed })
                        } catch {
                          setEditingData({ ...editingData, valor_json: e.target.value })
                        }
                      }}
                      placeholder="Valor JSON..."
                      rows={4}
                      className="w-full px-5 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-mono bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">CONFIGURACIÓN</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Editable por Usuario</span>
                        <Switch
                          checked={editingData.editable}
                          onChange={(c) => setEditingData({ ...editingData, editable: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Requiere Reinicio</span>
                        <Switch
                          checked={editingData.requiere_reinicio}
                          onChange={(c) => setEditingData({ ...editingData, requiere_reinicio: c })}
                        />
                      </div>
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
                      {selected.etiqueta}
                    </h2>
                    <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selected.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm font-medium tracking-tight">
                    Parámetro del Sistema · Código: {selected.codigo}
                  </p>
                </div>
                <div className="flex gap-2">
                    {permisos.editar && (
                      <button
                        onClick={() => handleOpenEditor(selected)}
                        className="size-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center active:scale-90"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="space-y-12">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">CONFIGURACIÓN TÉCNICA</p>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950">
                        <span className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-400">NIVEL DE APLICACIÓN</span>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{selected.nivel}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Alcance del parámetro en el sistema.</p>
                          </div>
                          <Badge variant="info" className="font-black h-8 px-4 text-xs">
                            {selected.nivel}
                          </Badge>
                        </div>
                      </div>

                      {(selected.nivel === 'EMPRESA' || selected.nivel === 'USUARIO') && selected.empresa_id && (
                        <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">EMPRESA ASOCIADA</span>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{selected.empresa?.nombre || `Empresa ID: ${selected.empresa_id}`}</h4>
                              <p className="text-[11px] text-slate-500 font-medium">Empresa a la que aplica este parámetro.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">MÓDULO ASOCIADO</span>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{selected.modulo?.descripcion}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Módulo del sistema al que pertenece.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">VALOR Y TIPO DE DATO</p>
                    <div className="space-y-3">
                      <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950">
                        <span className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-400">TIPO DE DATO</span>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{selected.tipo_dato}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Tipo de valor que almacena el parámetro.</p>
                          </div>
                          <Badge variant="neutral" className="font-black h-8 px-4 text-xs">
                            {selected.tipo_dato}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">VALOR ACTUAL</span>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">
                              {selected.tipo_dato === 'STRING' && selected.valor_string}
                              {selected.tipo_dato === 'NUMBER' && selected.valor_number}
                              {selected.tipo_dato === 'BOOLEAN' && (selected.valor_boolean ? 'Verdadero' : 'Falso')}
                              {selected.tipo_dato === 'DATE' && selected.valor_date}
                              {selected.tipo_dato === 'JSON' && selected.valor_json && JSON.stringify(selected.valor_json)}
                              {!selected.valor_string && !selected.valor_number && selected.valor_boolean === null && !selected.valor_date && !selected.valor_json && 'Sin valor'}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">Valor predeterminado del parámetro.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">settings_suggest</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Configuración del Sistema</p>
                <p className="text-xs font-medium text-slate-400 italic">Selecciona un parámetro para visualizar su configuración.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}