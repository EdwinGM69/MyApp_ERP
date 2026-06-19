'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface Cliente {
  id: number
  empresa_id: number
  codigo: string
  tipo: string
  nombre: string
  nombres_completos?: string | null
  apellidos_completos?: string | null
  nif?: string | null
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  ubigeo?: string | null
  departamento?: string | null
  provincia?: string | null
  distrito?: string | null
  contacto?: string | null
  activo: boolean
  created_at?: string
}

export default function ClientesPage() {
  const permisos = usePermisos()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Cliente | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/clientes?search=${search}`)
      const json = await res.json()
      setClientes(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar clientes')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      setSelected(clientes.find(c => c.id === selectedId) || null)
    }
  }, [selectedId, clientes])

  const handleOpenEditor = (c?: Cliente) => {
    if (c) {
      console.log('DEBUG: Abriendo editor con cliente:', JSON.stringify(c))
    }
    setEditingData(c || {
      codigo: '',
      tipo: 'natural',
      nombre: '',
      nombres_completos: '',
      apellidos_completos: '',
      nif: '',
      email: '',
      telefono: '',
      direccion: '',
      ubigeo: '',
      departamento: '',
      provincia: '',
      distrito: '',
      contacto: '',
      activo: true
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return

    console.log('DEBUG: Guardando cliente:', JSON.stringify(editingData))

    // Convert empty strings to null for optional fields
    const dataToSave = {
      ...editingData,
      nombres_completos: editingData.nombres_completos || null,
      apellidos_completos: editingData.apellidos_completos || null,
      nif: editingData.nif || null,
      email: editingData.email || null,
      telefono: editingData.telefono || null,
      direccion: editingData.direccion || null,
      ubigeo: editingData.ubigeo || null,
      departamento: editingData.departamento || null,
      provincia: editingData.provincia || null,
      distrito: editingData.distrito || null,
      contacto: editingData.contacto || null,
    }

    console.log('DEBUG: Data a guardar:', JSON.stringify(dataToSave))

    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/clientes', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(dataToSave)
      })
      if (res.ok) {
        toast.success(isNew ? 'Cliente creado' : 'Cliente actualizado')
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
      <Topbar title="Catálogo de Clientes" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Master */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Listado Maestro</h3>
              {permisos.crear && (
                <button
                  onClick={() => {
                    setSelectedId(null)
                    handleOpenEditor()
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
                placeholder="Buscar cliente..."
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
            ) : clientes.map((c) => (
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
                    <span className="material-symbols-outlined text-lg">
                      {c.tipo === 'empresa' ? 'business' : 'person'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === c.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {c.nombre}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      {c.nif || 'SIN NIF'}
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
                    {editingData.id ? 'Actualizar Cliente' : 'Nuevo Cliente'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Gestión de Catálogo de Clientes</p>
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
                      disabled={!!editingData?.id}
                      placeholder="Ej: CLI-001"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setEditingData({ ...editingData, tipo: 'natural' })}
                      className={cn(
                        "flex-1 h-14 rounded-2xl border-2 transition-all flex items-center justify-center gap-2",
                        editingData.tipo === 'natural'
                          ? "bg-primary border-primary text-white shadow-lg"
                          : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <span className="material-symbols-outlined text-xl">person</span>
                      <span className="text-xs font-black uppercase">Persona Natural</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingData({ ...editingData, tipo: 'empresa' })}
                      className={cn(
                        "flex-1 h-14 rounded-2xl border-2 transition-all flex items-center justify-center gap-2",
                        editingData.tipo === 'empresa'
                          ? "bg-primary border-primary text-white shadow-lg"
                          : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <span className="material-symbols-outlined text-xl">business</span>
                      <span className="text-xs font-black uppercase">Empresa</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {editingData.tipo === 'empresa' ? 'Razón Social' : 'Nombres Completos'}
                    </label>
                    <input
                      type="text"
                      value={editingData.nombre}
                      onChange={(e) => setEditingData({ ...editingData, nombre: e.target.value })}
                      placeholder={editingData.tipo === 'empresa' ? 'Ej: Empresa SAC' : 'Ej: Juan Pérez'}
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">N° Documento (NIF)</label>
                    <input
                      type="text"
                      value={editingData.nif || ''}
                      onChange={(e) => setEditingData({ ...editingData, nif: e.target.value })}
                      placeholder="Ej: 12345678"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {editingData.tipo === 'natural' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombres</label>
                      <input
                        type="text"
                        value={editingData.nombres_completos || ''}
                        onChange={(e) => setEditingData({ ...editingData, nombres_completos: e.target.value })}
                        placeholder="Ej: Juan Carlos"
                        className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellidos</label>
                      <input
                        type="text"
                        value={editingData.apellidos_completos || ''}
                        onChange={(e) => setEditingData({ ...editingData, apellidos_completos: e.target.value })}
                        placeholder="Ej: Pérez García"
                        className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editingData.email || ''}
                      onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <input
                      type="tel"
                      value={editingData.telefono || ''}
                      onChange={(e) => setEditingData({ ...editingData, telefono: e.target.value })}
                      placeholder="+51 999 999 999"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                  <input
                    type="text"
                    value={editingData.direccion || ''}
                    onChange={(e) => setEditingData({ ...editingData, direccion: e.target.value })}
                    placeholder="Ej: Av. Principal 123"
                    className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubigeo</label>
                  <input
                    type="text"
                    value={editingData.ubigeo || ''}
                    onChange={(e) => setEditingData({ ...editingData, ubigeo: e.target.value })}
                    placeholder="Ej: 150112"
                    className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                    <input
                      type="text"
                      value={editingData.departamento || ''}
                      onChange={(e) => setEditingData({ ...editingData, departamento: e.target.value })}
                      placeholder="Ej: Lima"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Provincia</label>
                    <input
                      type="text"
                      value={editingData.provincia || ''}
                      onChange={(e) => setEditingData({ ...editingData, provincia: e.target.value })}
                      placeholder="Ej: Lima"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distrito</label>
                    <input
                      type="text"
                      value={editingData.distrito || ''}
                      onChange={(e) => setEditingData({ ...editingData, distrito: e.target.value })}
                      placeholder="Ej: Lince"
                      className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={editingData.contacto || ''}
                    onChange={(e) => setEditingData({ ...editingData, contacto: e.target.value })}
                    placeholder="Nombre de contacto"
                    className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
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
                      {selected.nombre}
                    </h2>
                    <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selected.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm font-medium tracking-tight">
                    Cliente · Código Maestro: {selected.codigo}
                  </p>
                </div>
                <div className="flex gap-2">
                  {permisos.editar && (
                    <button
                      onClick={() => handleOpenEditor(selected)}
                      className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Editar Cliente
                    </button>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="space-y-12">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">DATOS PRINCIPALES</p>
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Cliente</span>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xl text-primary">
                            {selected.tipo === 'empresa' ? 'business' : 'person'}
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {selected.tipo === 'empresa' ? 'Empresa' : 'Persona Natural'}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Documento de Identidad</span>
                        <span className="text-lg font-black text-slate-800 dark:text-white">{selected.nif || '—'}</span>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Correo Electrónico</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.email || '—'}</span>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Teléfono</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.telefono || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">DIRECCIÓN Y CONTACTO</p>
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dirección</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.direccion || '—'}</span>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ubicación</span>
                        <div className="flex flex-col gap-1">
                          {selected.ubigeo && <span className="text-xs text-slate-500 font-mono">Ubigeo: {selected.ubigeo}</span>}
                          {selected.departamento && <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.departamento}</span>}
                          {selected.provincia && <span className="text-xs text-slate-500">{selected.provincia} • {selected.distrito}</span>}
                          {!selected.departamento && <span className="text-sm text-slate-400">—</span>}
                        </div>
                      </div>

                      {selected.contacto && (
                        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Persona de Contacto</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.contacto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 animate-in fade-in duration-700">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20 font-variation-icon">groups</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">Catálogo Central</p>
                <p className="text-xs font-medium text-slate-400 italic">Selecciona un cliente para visualizar sus datos.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}