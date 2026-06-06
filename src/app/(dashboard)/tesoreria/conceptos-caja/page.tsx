'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface ConceptoCaja {
  id: number
  codigo: string
  descripcion: string
  tipo_operacion: 'Ingreso' | 'Egreso'
  requiere_cliente: boolean
  requiere_proveedor: boolean
  requiere_persona: boolean
  activo: boolean
}

export default function ConceptosCajaPage() {
  // Master List
  const [conceptos, setConceptos] = useState<ConceptoCaja[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<ConceptoCaja | null>(null)

  // Editor State (Inline)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const permisos = usePermisos()

  // Fetch List
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/tesoreria/conceptos-caja?search=${search}`)
      const json = await res.json()
      setConceptos(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar conceptos de caja')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      setSelected(conceptos.find(c => c.id === selectedId) || null)
    }
  }, [selectedId, conceptos])

  const handleOpenEditor = (c?: any) => {
    setEditingData(c || {
      codigo: '',
      descripcion: '',
      tipo_operacion: 'Ingreso',
      requiere_cliente: false,
      requiere_proveedor: false,
      requiere_persona: false,
      activo: true
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return
    if (!editingData.codigo || !editingData.descripcion || !editingData.tipo_operacion) {
      toast.error('Complete todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/tesoreria/conceptos-caja', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingData)
      })
      if (res.ok) {
        toast.success(isNew ? 'Concepto creado' : 'Concepto actualizado')
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
      <Topbar title="Conceptos de Caja" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-84 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Listado Maestro</h3>
                <Badge variant="neutral" className="h-4 px-1.5 text-[8px] font-black">{conceptos.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchList()}
                  className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-all flex items-center justify-center active:scale-90"
                  title="Refrescar lista"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
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
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar concepto..."
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
            ) : conceptos.map((c) => (
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
                    selectedId === c.id 
                      ? (c.tipo_operacion === 'Ingreso' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {c.tipo_operacion === 'Ingreso' ? 'IN' : 'EG'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === c.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {c.descripcion}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      {c.codigo} · {c.tipo_operacion}
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
                    {editingData.id ? 'Actualizar Concepto' : 'Nuevo Concepto'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Configuración de Concepto de Caja</p>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Concepto</label>
                    <input
                      type="text"
                      value={editingData.codigo}
                      onChange={(e) => setEditingData({ ...editingData, codigo: e.target.value })}
                      placeholder="Ej: VENTAS01"
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

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                    <input
                      type="text"
                      value={editingData.descripcion}
                      onChange={(e) => setEditingData({ ...editingData, descripcion: e.target.value })}
                      placeholder="Ej: Ingreso por Ventas de Mostrador"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Operación</label>
                    <select
                      value={editingData.tipo_operacion}
                      onChange={(e) => setEditingData({ ...editingData, tipo_operacion: e.target.value })}
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      <option value="Ingreso">Ingreso</option>
                      <option value="Egreso">Egreso</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Requisitos de Registro</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requiere Cliente</label>
                      <div className="flex items-center">
                        <Switch
                          checked={editingData.requiere_cliente}
                          onChange={(c) => setEditingData({ ...editingData, requiere_cliente: c })}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requiere Proveedor</label>
                      <div className="flex items-center">
                        <Switch
                          checked={editingData.requiere_proveedor}
                          onChange={(c) => setEditingData({ ...editingData, requiere_proveedor: c })}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requiere Persona</label>
                      <div className="flex items-center">
                        <Switch
                          checked={editingData.requiere_persona}
                          onChange={(c) => setEditingData({ ...editingData, requiere_persona: c })}
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
                      {selected.descripcion}
                    </h2>
                    <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selected.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm font-medium tracking-tight">
                    Concepto de Caja · Código: {selected.codigo} · Tipo: {selected.tipo_operacion}
                  </p>
                </div>
                <div className="flex gap-2">
                  {permisos.editar && (
                    <button
                      onClick={() => handleOpenEditor(selected)}
                      className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Editar Configuración
                    </button>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">VALORES REQUERIDOS</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requiere Cliente</span>
                        <Badge variant={selected.requiere_cliente ? 'info' : 'neutral'}>{selected.requiere_cliente ? 'Sí' : 'No'}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requiere Proveedor</span>
                        <Badge variant={selected.requiere_proveedor ? 'info' : 'neutral'}>{selected.requiere_proveedor ? 'Sí' : 'No'}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requiere Persona</span>
                        <Badge variant={selected.requiere_persona ? 'info' : 'neutral'}>{selected.requiere_persona ? 'Sí' : 'No'}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">AUDITORÍA Y ESTADO</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2.5 px-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl text-slate-400">check_circle</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Estado Actual</span>
                      </div>
                      <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[9px] px-3">
                        {selected.activo ? 'OPERATIVO' : 'SUSPENDIDO'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl text-slate-400">pin</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">ID del Registro</span>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">#{selected.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">category</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Conceptos de Caja</p>
                <p className="text-xs font-medium text-slate-400 italic">Selecciona un concepto para visualizar sus configuraciones.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
