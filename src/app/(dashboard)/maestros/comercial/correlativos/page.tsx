'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'

interface Correlativo {
  id: number
  tipo_documento: string
  serie: string
  numero_actual: number
  periodo_reinicio: 'ANUAL' | 'MENSUAL' | 'NUNCA'
  year: number
  month: number
  ceros_relleno: number
  activo: boolean
}

const TIPOS_DOCUMENTO = [
  { value: 'PEDVTA', label: 'Pedido Venta' },
  { value: 'MOVALM', label: 'Movimiento Almacén' },
  { value: 'FACTURA', label: 'Factura' },
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'NOTACREDITO_FACTURA', label: 'Nota Crédito Factura' },
  { value: 'NOTACREDITO_BOLETA', label: 'Nota Crédito Boleta' },
  { value: 'NOTA_DEBITO', label: 'Nota Débito' },
]

const PERIODOS = [
  { value: 'ANUAL', label: 'Anual' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'NUNCA', label: 'Nunca' },
]

export default function CorrelativosPage() {
  const permisos = usePermisos()
  const [correlativos, setCorrelativos] = useState<Correlativo[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Correlativo | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/comercial/correlativos?search=${search}`)
      const json = await res.json()
      setCorrelativos(json.data || [])
      if (json.data?.length > 0 && !selectedId) {
        setSelectedId(json.data[0].id)
        setSelected(json.data[0])
      }
    } catch (err) {
      toast.error('Error al cargar correlativos')
    } finally {
      setLoadingMaster(false)
    }
  }, [search, selectedId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      setSelected(correlativos.find(c => c.id === selectedId) || null)
    }
  }, [selectedId, correlativos])

  const handleOpenEditor = (c?: Correlativo) => {
    const currentYear = new Date().getFullYear()
    setEditingData(c || {
      tipo_documento: 'FACTURA',
      serie: '',
      numero_actual: 0,
      periodo_reinicio: 'ANUAL',
      year: currentYear,
      month: 0,
      ceros_relleno: 8,
      activo: true
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return

    if (!editingData.tipo_documento || !editingData.serie || !editingData.year) {
      toast.error('Complete todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const isNew = !editingData.id
      const res = await apiFetch('/api/comercial/correlativos', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(editingData)
      })
      if (res.ok) {
        toast.success(isNew ? 'Correlativo creado' : 'Correlativo actualizado')
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

  const formatNumero = (numero: number, ceros: number): string => {
    return numero.toString().padStart(ceros, '0')
  }

  const getTipoDocumentoLabel = (tipo: string): string => {
    return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo
  }

  const getPeriodoLabel = (periodo: string): string => {
    return PERIODOS.find(p => p.value === periodo)?.label || periodo
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Correlativos" />

      <div className="flex flex-1 overflow-hidden">
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
                placeholder="Buscar correlativo..."
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
            ) : correlativos.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <span className="text-xs font-medium">Sin correlativos</span>
              </div>
            ) : correlativos.map((c) => (
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
                    {c.serie.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-sm font-bold block truncate tracking-tight transition-colors",
                      selectedId === c.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {c.serie} - {c.year}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      {c.tipo_documento}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950 p-8">
          {isEditing && editingData ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl font-variation-icon">tag</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-1">
                      {editingData.id ? 'Refinar Correlativo' : 'Nuevo Correlativo'}
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      Configuración de Numeración
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
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <span className="material-symbols-outlined text-primary">info</span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuración del Documento</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Documento</label>
                        <div className="relative group">
                          <select
                            value={editingData.tipo_documento}
                            onChange={(e) => setEditingData({ ...editingData, tipo_documento: e.target.value })}
                            className="w-full h-14 pl-6 pr-12 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 uppercase appearance-none transition-all"
                          >
                            {TIPOS_DOCUMENTO.map(tipo => (
                              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors">description</span>
                        </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Serie</label>
                        <input
                          type="text"
                          value={editingData.serie}
                          onChange={(e) => setEditingData({ ...editingData, serie: e.target.value.toUpperCase() })}
                          placeholder="Ej: 001"
                          className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-black uppercase bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all text-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número Actual</label>
                        <input
                          type="number"
                          value={editingData.numero_actual}
                          onChange={(e) => setEditingData({ ...editingData, numero_actual: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                          className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Año</label>
                        <input
                          type="number"
                          value={editingData.year}
                          onChange={(e) => setEditingData({ ...editingData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                          min="2000"
                          max="2100"
                          className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mes (0 = anual)</label>
                        <input
                          type="number"
                          value={editingData.month}
                          onChange={(e) => setEditingData({ ...editingData, month: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="12"
                          className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ceros de Relleno</label>
                        <input
                          type="number"
                          value={editingData.ceros_relleno}
                          onChange={(e) => setEditingData({ ...editingData, ceros_relleno: parseInt(e.target.value) || 8 })}
                          min="1"
                          max="20"
                          className="w-full h-14 px-6 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <span className="material-symbols-outlined text-amber-500">restart_alt</span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reinicio de Secuencia</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Periodo de Reinicio</label>
                      <div className="relative group">
                        <select
                          value={editingData.periodo_reinicio}
                          onChange={(e) => setEditingData({ ...editingData, periodo_reinicio: e.target.value })}
                          className="w-full h-14 pl-6 pr-12 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 uppercase appearance-none transition-all"
                        >
                          {PERIODOS.map(periodo => (
                            <option key={periodo.value} value={periodo.value}>{periodo.label}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-amber-500 transition-colors">calendar_month</span>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl">preview</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vista Previa del Número</p>
                          <p className="text-lg font-black text-primary uppercase tracking-tight">
                            {editingData.serie || 'SIN SERIE'}-{formatNumero(editingData.numero_actual || 0, editingData.ceros_relleno || 8)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
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

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="size-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-3xl">help_center</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">¿Necesitas Ayuda?</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        Los correlativos definen la numeración automática de documentos. Configure el periodo de reinicio para resetear la secuencia según sea necesario.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6 duration-1000 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl">tag</span>
                </div>

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 px-4 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xs tracking-tighter uppercase">
                        {selected.serie}
                      </div>
                      <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] h-8 px-4 rounded-xl">
                        {selected.activo ? 'VIGENTE' : 'OBSOLETO'}
                      </Badge>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase max-w-2xl">
                      {getTipoDocumentoLabel(selected.tipo_documento)}
                    </h2>
                  </div>

                  {permisos.editar && (
                    <button
                      onClick={() => handleOpenEditor(selected)}
                      className="h-14 px-8 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:scale-[1.03] shadow-2xl shadow-slate-900/20 dark:shadow-white/5 transition-all active:scale-95 flex items-center gap-3 shrink-0 uppercase tracking-widest"
                    >
                      <span className="material-symbols-outlined text-xl">stylus_note</span>
                      Ajustar Correlativo
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-3">
                      <span className="size-2 rounded-full bg-primary" />
                      Configuración de Numeración
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex items-start gap-5">
                        <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-2xl">numbers</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Número Actual</p>
                          <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-0.5">
                            {formatNumero(selected.numero_actual, selected.ceros_relleno)}
                          </h4>
                          <p className="text-[9px] font-black text-indigo-500 uppercase">Último número usado</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-5">
                        <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                          <span className="material-symbols-outlined text-2xl">restart_alt</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reinicio de Secuencia</p>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-0.5">
                            {getPeriodoLabel(selected.periodo_reinicio)}
                          </h4>
                          <p className="text-[9px] font-black text-amber-500 uppercase">PERIODO DE REINICIO</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200/50 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-10 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-3">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Periodo de Aplicación
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                        <div className="size-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary text-white shadow-lg shadow-primary/20">
                          <span className="material-symbols-outlined text-xl">calendar_today</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AÑO</p>
                          <h5 className="text-lg font-black text-slate-800 dark:text-white uppercase">
                            {selected.year}
                          </h5>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                        <div className={cn(
                          "size-12 rounded-2xl flex items-center justify-center shrink-0",
                          selected.month > 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}>
                          <span className="material-symbols-outlined text-xl">schedule</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MES</p>
                          <h5 className="text-lg font-black text-slate-800 dark:text-white uppercase">
                            {selected.month === 0 ? 'ANUAL' : selected.month}
                          </h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-200/50 dark:border-slate-800 space-y-6">
                    <div className="size-16 rounded-[1.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-3xl">tag</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tight">Identificador Completo</h4>
                      <p className="text-2xl font-black text-primary uppercase tracking-tight">
                        {selected.serie}-{formatNumero(selected.numero_actual, selected.ceros_relleno)}
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
                  <span className="material-symbols-outlined text-8xl opacity-10 font-variation-icon text-primary">tag</span>
                  <div className="absolute -bottom-2 -right-2 size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined">api</span>
                  </div>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 leading-none">Plataforma ERP v2.0</p>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">Gestión de Correlativos</h3>
                <p className="text-[11px] font-medium text-slate-400 italic">Selecciona un elemento de la lista para administrar la numeración de documentos.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}