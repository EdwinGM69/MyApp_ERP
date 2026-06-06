'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Material { id: number; codigo: string; descripcion: string; precio_venta: number; moneda: string; categoria_rel?: { id: number; descripcion: string } | null }
interface Categoria { id: number; codigo: string; descripcion: string }
interface CuponDetalle { id?: number; material_id: number; material?: Material }
interface CuponCat { id?: number; categoria_id: number; categoria?: Categoria }

interface Cupon {
  id: number
  nombre: string
  descripcion: string
  tipo: string
  valor: number
  moneda: { id: number; abreviatura: string; descripcion: string; simbolo: string }
  ilimitado: boolean
  limite_uso: number | null
  usos_actuales: number
  acumulable: boolean
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  created_at?: string
  updated_at?: string
  detalles?: CuponDetalle[]
  cupones?: CuponCat[]
}

const emptyEditing = () => ({
  id: undefined as number | undefined,
  nombre: '',
  descripcion: '',
  tipo: 'PORCENTAJE',
  valor: '',
  moneda_id: 1,
  ilimitado: true,
  limite_uso: '',
  acumulable: false,
  activo: true,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '',
  detalles: [] as Partial<CuponDetalle>[],
  categorias: [] as number[],
  showCategoriaSelector: false,
})

export default function CuponesPage() {
  const permisos = usePermisos()
  const [cupones, setCupones] = useState<Cupon[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Cupon | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<ReturnType<typeof emptyEditing> | null>(null)
  const [saving, setSaving] = useState(false)

  const [materiales, setMateriales] = useState<Material[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [monedas, setMonedas] = useState<{id: number; codigo: string; descripcion: string; simbolo: string}[]>([])

  const [detalleSearch, setDetalleSearch] = useState<Record<number, string>>({})
  const [detalleDropdownOpen, setDetalleDropdownOpen] = useState<Record<number, boolean>>({})

  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/precios/cupones?search=${encodeURIComponent(search)}&pageSize=200`)
      const json = await res.json()
      const data: Cupon[] = json.data || []
      setCupones(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
        setSelected(data[0])
      }
    } catch {
      toast.error('Error al cargar cupones')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])

  useEffect(() => { fetchList() }, [fetchList])

  useEffect(() => {
    if (selectedId) setSelected(cupones.find(c => c.id === selectedId) || null)
  }, [selectedId, cupones])

  useEffect(() => {
    async function load() {
      try {
        const [rm, rc, rmon] = await Promise.all([
          apiFetch('/api/materiales?limit=1000'),
          apiFetch('/api/materiales/categorias?pageSize=500'),
          apiFetch('/api/monedas'),
        ])
        const mj = await rm.json()
        const cj = await rc.json()
        const monj = await rmon.json()
        setMateriales(mj.data ?? [])
        setCategorias(cj.data ?? [])
        setMonedas(monj.data ?? [])
      } catch { /* silent */ }
    }
    load()
  }, [])

  const handleOpenEditor = (c?: Cupon) => {
    setDetalleSearch({})
    setDetalleDropdownOpen({})
    if (c) {
      setEditingData({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        tipo: c.tipo,
        valor: String(c.valor),
        moneda_id: c.moneda?.id ?? 1,
        ilimitado: c.ilimitado,
        limite_uso: c.limite_uso ? String(c.limite_uso) : '',
        acumulable: c.acumulable,
        activo: c.activo,
        fecha_inicio: c.fecha_inicio?.split('T')[0] ?? '',
        fecha_fin: c.fecha_fin?.split('T')[0] ?? '',
        detalles: c.detalles ?? [],
        categorias: c.cupones?.map(cat => cat.categoria_id) ?? [],
        showCategoriaSelector: false,
      })
    } else {
      setEditingData(emptyEditing())
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editingData) return
    if (!editingData.nombre?.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!editingData.fecha_inicio) { toast.error('La fecha de inicio es obligatoria'); return }
    if (!editingData.fecha_fin) { toast.error('La fecha fin es obligatoria'); return }

    setSaving(true)
    const isNew = !editingData.id
    const payload = {
      id: editingData.id,
      nombre: editingData.nombre.trim(),
      descripcion: editingData.descripcion?.trim() || '',
      tipo: editingData.tipo,
      valor: Number(editingData.valor),
      moneda_id: Number(editingData.moneda_id),
      ilimitado: editingData.ilimitado,
      limite_uso: editingData.ilimitado ? null : Number(editingData.limite_uso),
      acumulable: editingData.acumulable,
      activo: editingData.activo,
      fecha_inicio: editingData.fecha_inicio,
      fecha_fin: editingData.fecha_fin,
      detalles: (editingData.detalles as Partial<CuponDetalle>[])
        .filter(d => d.material_id)
        .map(d => ({ material_id: Number(d.material_id) })),
      categorias: (editingData.categorias as number[]).map(c => ({ categoria_id: c })),
    }

    try {
      const res = await apiFetch('/api/precios/cupones', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isNew ? 'Cupón creado' : 'Cupón actualizado')
        setIsEditing(false)
        await fetchList()
      } else {
        const j = await res.json()
        toast.error(j.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: string, value: any) =>
    setEditingData((prev: any) => ({ ...prev, [field]: value }))

  const toggleCategoria = (id: number) =>
    set('categorias', (editingData?.categorias ?? []).includes(id)
      ? (editingData?.categorias ?? []).filter((k: number) => k !== id)
      : [...(editingData?.categorias ?? []), id])

  const addDetalle = () => set('detalles', [...(editingData?.detalles ?? []), { material_id: 0 }])
  const removeDetalle = (i: number) => set('detalles', (editingData?.detalles ?? []).filter((_: any, idx: number) => idx !== i))
  const updateDetalle = (i: number, val: number) =>
    set('detalles', (editingData?.detalles ?? []).map((d: any, idx: number) => idx === i ? { ...d, material_id: val } : d))

  function fmtDate(s?: string) {
    if (!s) return '—'
    try {
      const datePart = s.split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, 'dd/MM/yyyy', { locale: es })
    } catch { return '—' }
  }

  function fmtAudit(s?: string) {
    if (!s) return '—'
    try { return format(new Date(s), 'dd/MM/yyyy HH:mm', { locale: es }) } catch { return '—' }
  }

  function calcDuracion(a: string, b: string) {
    if (!a || !b) return 0
    try { return Math.max(0, differenceInDays(new Date(b), new Date(a)) + 1) } catch { return 0 }
  }

  function fmtValor(tipo: string, valor: number, simbolo: string) {
    if (tipo === 'PORCENTAJE') return `${Number(valor)}%`
    return `${simbolo}${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const duracion = editingData ? calcDuracion(editingData.fecha_inicio, editingData.fecha_fin) : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Gestión de Cupones" />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Listado Maestro
              </h3>
              {permisos.crear && (
                <button
                  onClick={() => { setSelectedId(null); handleOpenEditor() }}
                  className="size-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                </button>
              )}
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar cupón..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm outline-none shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
            {loadingMaster ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <span className="text-xs font-medium uppercase tracking-widest">Cargando...</span>
              </div>
            ) : cupones.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl opacity-20 block mb-2">local_offer</span>
                <p className="text-xs font-medium uppercase tracking-widest opacity-50">Sin cupones</p>
              </div>
            ) : cupones.map(c => {
              const isActive = c.activo && new Date() <= new Date(c.fecha_fin)
              const simbolo = c.moneda?.simbolo || '$'
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setIsEditing(false) }}
                  className={cn(
                    'w-full p-4 text-left transition-all rounded-2xl group relative',
                    selectedId === c.id
                      ? 'bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700'
                      : 'hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      selectedId === c.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}>
                      <span className="material-symbols-outlined text-lg">local_offer</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        'text-sm font-bold block truncate tracking-tight transition-colors',
                        selectedId === c.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                      )}>
                        {c.nombre}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          'size-1.5 rounded-full shrink-0',
                          isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        )} />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter truncate">
                          {fmtValor(c.tipo, c.valor, simbolo)} · {c.tipo}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-10">
          {isEditing && editingData ? (
            <div className="max-w-4xl will-change-transform">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-2">
                    {editingData.id ? 'Actualizar Cupón' : 'Nuevo Cupón'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                    Gestión de Descuentos y Cupones
                  </p>
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
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Información General
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Nombre del Cupón
                          </label>
                          <input
                            type="text" required
                            value={editingData.nombre}
                            onChange={e => set('nombre', e.target.value)}
                            placeholder="Ej: DESC20_VERANO"
                            className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-xs font-black uppercase bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Estado
                          </label>
                          <div className="h-12 flex items-center">
                            <Switch
                              checked={editingData.activo}
                              onChange={v => set('activo', v)}
                            />
                            <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {editingData.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={editingData.descripcion}
                          onChange={e => set('descripcion', e.target.value)}
                          placeholder="Ej: Descuento del 20% en toda la tienda"
                          className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-xs font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Tipo de Descuento
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => { set('tipo', 'PORCENTAJE'); set('valor', '') }}
                            className={cn(
                              'flex-1 h-12 rounded-2xl border-2 text-xs font-bold transition-all',
                              editingData.tipo === 'PORCENTAJE'
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/50'
                            )}
                          >
                            Porcentaje (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => { set('tipo', 'MONTO FIJO'); set('valor', '') }}
                            className={cn(
                              'flex-1 h-12 rounded-2xl border-2 text-xs font-bold transition-all',
                              editingData.tipo === 'MONTO FIJO'
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/50'
                            )}
                          >
                            Monto Fijo ($)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Valor
                        </label>
                        <input
                          type="number"
                          value={editingData.valor}
                          onChange={e => set('valor', e.target.value)}
                          placeholder={editingData.tipo === 'PORCENTAJE' ? '20' : '10000'}
                          className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-xs font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Moneda
                        </label>
                        <select
                          value={editingData.moneda_id}
                          onChange={e => set('moneda_id', Number(e.target.value))}
                          disabled={editingData.tipo !== 'MONTO FIJO'}
                          className={cn(
                            'w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-xs font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all',
                            editingData.tipo !== 'MONTO FIJO' && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                          )}
                        >
                          {editingData.tipo !== 'MONTO FIJO' && <option value="">— Seleccione monto fijo —</option>}
                          {monedas.map(m => (
                            <option key={m.id} value={m.id}>{m.descripcion} ({m.simbolo})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 border border-slate-800 dark:border-slate-700">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Vigencia y Límites
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                          <input
                            type="date" required
                            value={editingData.fecha_inicio}
                            onChange={e => set('fecha_inicio', e.target.value)}
                            className="w-full h-12 px-5 border border-slate-600 dark:border-slate-500 rounded-2xl outline-none text-xs font-bold bg-white dark:bg-slate-100 text-slate-900 dark:text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                          <input
                            type="date" required
                            value={editingData.fecha_fin}
                            onChange={e => set('fecha_fin', e.target.value)}
                            className="w-full h-12 px-5 border border-slate-600 dark:border-slate-500 rounded-2xl outline-none text-xs font-bold bg-white dark:bg-slate-100 text-slate-900 dark:text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-slate-800/80 dark:bg-slate-800 border border-slate-700 dark:border-slate-600">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duración Estimada</span>
                        <span className="text-xs font-black text-white">{duracion} días</span>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingData.ilimitado}
                            onChange={e => set('ilimitado', e.target.checked)}
                            className="size-5 rounded border-slate-600 dark:border-slate-500 text-primary focus:ring-primary/20"
                          />
                          <span className="text-xs font-bold text-slate-200 dark:text-slate-300">Uso ilimitado</span>
                        </label>

                        {!editingData.ilimitado && (
                          <div className="space-y-2 ml-8">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Límite de Usos
                            </label>
                            <input
                              type="number"
                              value={editingData.limite_uso}
                              onChange={e => set('limite_uso', e.target.value)}
                              placeholder="Ej: 100"
                              className="w-full h-12 px-5 border border-slate-600 dark:border-slate-500 rounded-2xl outline-none text-xs font-bold bg-white dark:bg-slate-100 text-slate-900 dark:text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingData.acumulable}
                            onChange={e => set('acumulable', e.target.checked)}
                            className="size-5 rounded border-slate-600 dark:border-slate-500 text-primary focus:ring-primary/20"
                          />
                          <span className="text-xs font-bold text-slate-200 dark:text-slate-300">Acumulable con otras promociones</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-2">
                      Categorías de Aplicación
                    </label>
                    {(editingData.categorias as number[]).map(catId => {
                      const cat = categorias.find(c => c.id === catId)
                      if (!cat) return null
                      return (
                        <div key={catId} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-violet-700 dark:text-violet-400 px-4 py-2 rounded-xl text-xs font-bold shadow-sm group">
                          {cat.descripcion}
                          <button type="button" onClick={() => toggleCategoria(catId)} className="text-violet-300 hover:text-red-500 transition-colors flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                          </button>
                        </div>
                      )
                    })}
                    {categorias.length > (editingData.categorias as number[]).length && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => set('showCategoriaSelector', !editingData.showCategoriaSelector)}
                          className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 border-dashed text-slate-400 hover:border-violet-400 hover:text-violet-500 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_circle</span>
                          + Agregar
                        </button>
                        {editingData.showCategoriaSelector && (
                          <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-60 z-20 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 pb-2 mb-2 border-b border-slate-50 dark:border-slate-800">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seleccionar Categoría</p>
                            </div>
                            {categorias
                              .filter(c => !(editingData.categorias as number[]).includes(c.id))
                              .map(cat => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                  onClick={() => { toggleCategoria(cat.id); set('showCategoriaSelector', false) }}
                                >
                                  {cat.descripcion}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Seleccione las categorías de materiales donde se aplicará este cupón. Deje vacío para aplicar a todas.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Restricciones de Producto
                    </label>
                    <button type="button" onClick={addDetalle}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add_circle</span>
                      Añadir producto
                    </button>
                  </div>

                  {editingData.detalles.length === 0 ? (
                    <div className="py-6 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-3xl opacity-30">inventory_2</span>
                      <p className="text-xs font-medium">Aplica a todos los productos. Añade restricciones si quieres limitar el alcance.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(editingData.detalles as Partial<CuponDetalle>[]).map((d, i) => {
                        const mat = materiales.find(m => m.id === Number(d.material_id))
                        const selectedCats = editingData.categorias as number[]
                        const materialesFiltrados = selectedCats.length > 0
                          ? materiales.filter(m => m.categoria_rel && selectedCats.includes(m.categoria_rel.id))
                          : materiales
                        const currentSearch = detalleSearch[i] || ''
                        const filteredMateriales = currentSearch
                          ? materialesFiltrados.filter(m =>
                            m.descripcion.toLowerCase().includes(currentSearch.toLowerCase()) ||
                            m.codigo.toLowerCase().includes(currentSearch.toLowerCase())
                          )
                          : materialesFiltrados
                        const isDropdownOpen = detalleDropdownOpen[i] || false

                        return (
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="size-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-slate-500 text-[16px]">inventory_2</span>
                            </div>
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={currentSearch}
                                onChange={e => { setDetalleSearch({ ...detalleSearch, [i]: e.target.value }); setDetalleDropdownOpen({ ...detalleDropdownOpen, [i]: true }) }}
                                onFocus={() => setDetalleDropdownOpen({ ...detalleDropdownOpen, [i]: true })}
                                onBlur={() => setTimeout(() => setDetalleDropdownOpen({ ...detalleDropdownOpen, [i]: false }), 200)}
                                placeholder={mat ? `${mat.codigo} - ${mat.descripcion}` : "Buscar producto..."}
                                className="w-full bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                              />
                              {isDropdownOpen && filteredMateriales.length > 0 && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                  {filteredMateriales.slice(0, 20).map(m => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                      onClick={() => { updateDetalle(i, m.id); setDetalleSearch({ ...detalleSearch, [i]: '' }); setDetalleDropdownOpen({ ...detalleDropdownOpen, [i]: false }) }}
                                    >
                                      {m.codigo} - {m.descripcion}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button type="button" onClick={() => removeDetalle(i)}
                              className="size-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-52 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div className="max-w-5xl mx-auto space-y-10">
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
                    Cupón · {fmtValor(selected.tipo, selected.valor, selected.moneda?.simbolo || '$')} · {fmtDate(selected.fecha_inicio)} – {fmtDate(selected.fecha_fin)}
                  </p>
                </div>
              {permisos.crear && (
                <button
                  onClick={() => handleOpenEditor(null)}
                  className="size-8 rounded-xl bg-primary text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              )}
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                      DATOS GENERALES
                    </p>
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{selected.descripcion || '—'}</span>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor del Descuento</span>
                        <p className="text-2xl font-black text-primary">
                          {fmtValor(selected.tipo, selected.valor, selected.moneda?.simbolo || '$')}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Tipo: {selected.tipo}</p>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categorías de Aplicación</span>
                        {selected.cupones && selected.cupones.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selected.cupones.map(c => (
                              <span key={c.id} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                                {c.categoria?.descripcion || `#${c.categoria_id}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-800 dark:text-white">Sin restricción de categoría</span>
                        )}
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Restricciones de Producto</span>
                        {selected.detalles && selected.detalles.length > 0 ? (
                          <div className="space-y-2">
                            {selected.detalles.map((d, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                  {d.material?.descripcion || `Material #${d.material_id}`}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{d.material?.codigo}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">Aplica a todos los productos</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                      VIGENCIA Y USOS
                    </p>
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vigencia</span>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {fmtDate(selected.fecha_inicio)} → {fmtDate(selected.fecha_fin)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {calcDuracion(selected.fecha_inicio, selected.fecha_fin)} días de duración
                        </p>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Límite de Usos</span>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-2xl font-black text-slate-800 dark:text-white">
                              {selected.ilimitado ? '∞' : selected.limite_uso || 0}
                            </p>
                            <p className="text-xs text-slate-400">Límite máximo</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-2xl font-black text-primary">
                              {selected.usos_actuales || 0}
                            </p>
                            <p className="text-xs text-slate-400">Usos realizados</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Opciones Adicionales</span>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'size-5 rounded-md flex items-center justify-center',
                              selected.acumulable ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                            )}>
                              {selected.acumulable && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                            </div>
                            <span className={cn(
                              'text-sm font-bold',
                              selected.acumulable ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'
                            )}>Acumulable con otras promociones</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Auditoría</span>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <p>Creado: <span className="font-bold">{fmtAudit(selected.created_at)}</span></p>
                          <p>Modificado: <span className="font-bold">{fmtAudit(selected.updated_at)}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20">local_offer</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">
                  Catálogo de Cupones
                </p>
                <p className="text-xs font-medium text-slate-400 italic">
                  Selecciona un cupón del listado o crea uno nuevo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}