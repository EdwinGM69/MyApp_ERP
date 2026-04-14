'use client'

import { useState, useEffect, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

/* ─── Types ─────────────────────────────────────────────────── */
interface Material { id: number; codigo: string; descripcion: string; categoria_rel?: { id: number; descripcion: string } | null }
interface Categoria { id: number; codigo: string; descripcion: string }
interface PromocanAl { id?: number; canal: string }
interface PromoDetalle { id?: number; material_id: number; material?: Material }
interface PromoCat { id?: number; categoria_id: number; categoria?: Categoria }

interface Promocion {
  id: number
  nombre: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
  cantidad_compra: number
  cantidad_regalo: number
  activo: boolean
  detalles?: PromoDetalle[]
  canales?: PromocanAl[]
  categorias?: PromoCat[]
  created_at?: string
  updated_at?: string
}

/* ─── Constants ─────────────────────────────────────────────── */
const CANALES = [
  { key: 'pos', label: 'Puntos de Venta Físicos', icon: 'storefront' },
  { key: 'ecommerce', label: 'Tienda Online (E-commerce)', icon: 'shopping_cart' },
  { key: 'app', label: 'App Móvil', icon: 'smartphone' },
  { key: 'mayoristas', label: 'Distribuidores Mayoristas', icon: 'local_shipping' },
]

/* ─── Helpers ───────────────────────────────────────────────── */
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

function calcDescuento(compra: number, regalo: number) {
  if (compra <= 0) return 0
  return Math.round((regalo / compra) * 100)
}

function promoLabel(compra: number, regalo: number) {
  if (compra > 0 && regalo > 0) return `${compra}×${regalo}`
  return '—'
}

function genId() {
  return `PROM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

/* ─── Empty editing shape ────────────────────────────────────── */
const emptyEditing = () => ({
  nombre: '',
  descripcion: '',
  activo: true,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin: '',
  cantidad_compra: 2,
  cantidad_regalo: 1,
  detalles: [] as Partial<PromoDetalle>[],
  canales: ['pos', 'ecommerce'] as string[],
  categorias: [] as number[],
  showCategoriaSelector: false,
})

/* ════════════════════════════════════════════════════════════ */
export default function PromocionesPage() {
  /* ── List state ── */
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Promocion | null>(null)

  /* ── Form state ── */
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<ReturnType<typeof emptyEditing> | any>(null)
  const [saving, setSaving] = useState(false)

  /* ── Lookup lists ── */
  const [materiales, setMateriales] = useState<Material[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  /* ── Material search state ── */
  const [detalleSearch, setDetalleSearch] = useState<Record<number, string>>({})
  const [detalleDropdownOpen, setDetalleDropdownOpen] = useState<Record<number, boolean>>({})

  /* ── Fetch main list ── */
  const fetchList = useCallback(async () => {
    setLoadingMaster(true)
    try {
      const res = await apiFetch(`/api/precios/promociones?search=${encodeURIComponent(search)}&pageSize=200`)
      const json = await res.json()
      const data: Promocion[] = json.data || []
      setPromociones(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
        setSelected(data[0])
      }
    } catch {
      toast.error('Error al cargar promociones')
    } finally {
      setLoadingMaster(false)
    }
  }, [search])                              // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchList() }, [fetchList])

  useEffect(() => {
    if (selectedId) setSelected(promociones.find(p => p.id === selectedId) || null)
  }, [selectedId, promociones])

  /* ── Fetch lookups only once ── */
  useEffect(() => {
    async function load() {
      try {
        const [rm, rc] = await Promise.all([
          apiFetch('/api/materiales?limit=1000'),
          apiFetch('/api/materiales/categorias?pageSize=500'),
        ])
        const mj = await rm.json()
        const cj = await rc.json()
        setMateriales(mj.data ?? [])
        setCategorias(cj.data ?? [])
      } catch { /* silent */ }
    }
    load()
  }, [])

  /* ── Open editor ── */
  const handleOpenEditor = (p?: Promocion) => {
    setDetalleSearch({})
    setDetalleDropdownOpen({})
    if (p) {
      setEditingData({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        activo: p.activo,
        fecha_inicio: p.fecha_inicio?.split('T')[0] ?? '',
        fecha_fin: p.fecha_fin?.split('T')[0] ?? '',
        cantidad_compra: p.cantidad_compra,
        cantidad_regalo: p.cantidad_regalo,
        detalles: p.detalles ?? [],
        canales: p.canales?.map(c => c.canal) ?? [],
        categorias: p.categorias?.map(c => c.categoria_id) ?? [],
        showCategoriaSelector: false,
      })
    } else {
      setEditingData(emptyEditing())
    }
    setIsEditing(true)
  }

  /* ── Save ── */
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
      activo: editingData.activo,
      fecha_inicio: editingData.fecha_inicio,
      fecha_fin: editingData.fecha_fin,
      cantidad_compra: editingData.cantidad_compra,
      cantidad_regalo: editingData.cantidad_regalo,
      detalles: (editingData.detalles as Partial<PromoDetalle>[])
        .filter(d => d.material_id)
        .map(d => ({ material_id: Number(d.material_id) })),
      canales: (editingData.canales as string[]).map(c => ({ canal: c })),
      categorias: (editingData.categorias as number[]).map(c => ({ categoria_id: c })),
    }

    try {
      const res = await apiFetch('/api/precios/promociones', {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(isNew ? 'Promoción creada' : 'Promoción actualizada')
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

  /* ── Editing helpers ── */
  const set = (field: string, value: any) =>
    setEditingData((prev: any) => ({ ...prev, [field]: value }))

  const toggleCanal = (key: string) =>
    set('canales', (editingData?.canales ?? []).includes(key)
      ? editingData.canales.filter((k: string) => k !== key)
      : [...(editingData?.canales ?? []), key])

  const toggleCategoria = (id: number) =>
    set('categorias', (editingData?.categorias ?? []).includes(id)
      ? editingData.categorias.filter((k: number) => k !== id)
      : [...(editingData?.categorias ?? []), id])

  const addDetalle = () => set('detalles', [...(editingData?.detalles ?? []), { material_id: 0 }])
  const removeDetalle = (i: number) => set('detalles', editingData.detalles.filter((_: any, idx: number) => idx !== i))
  const updateDetalle = (i: number, val: number) =>
    set('detalles', editingData.detalles.map((d: any, idx: number) => idx === i ? { ...d, material_id: val } : d))

  /* ── Derived ── */
  const duracion = editingData ? calcDuracion(editingData.fecha_inicio, editingData.fecha_fin) : 0
  const descuento = editingData ? calcDescuento(editingData.cantidad_compra, editingData.cantidad_regalo) : 0
  const etiPromo = editingData ? promoLabel(editingData.cantidad_compra, editingData.cantidad_regalo) : '—'

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Gestión de Promociones" />

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ──────────────── Sidebar Master ──────────────── */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Listado Maestro
              </h3>
              <button
                onClick={() => { setSelectedId(null); handleOpenEditor() }}
                className="size-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar promoción..."
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
            ) : promociones.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl opacity-20 block mb-2">campaign</span>
                <p className="text-xs font-medium uppercase tracking-widest opacity-50">Sin promociones</p>
              </div>
            ) : promociones.map(p => {
              const isActive = p.activo && new Date() <= new Date(p.fecha_fin)
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setIsEditing(false) }}
                  className={cn(
                    'w-full p-4 text-left transition-all rounded-2xl group relative',
                    selectedId === p.id
                      ? 'bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700'
                      : 'hover:bg-slate-200/30 dark:hover:bg-slate-800/30 text-slate-500'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      selectedId === p.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}>
                      <span className="material-symbols-outlined text-lg">campaign</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        'text-sm font-bold block truncate tracking-tight transition-colors',
                        selectedId === p.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                      )}>
                        {p.nombre}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          'size-1.5 rounded-full shrink-0',
                          isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        )} />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter truncate">
                          {promoLabel(p.cantidad_compra, p.cantidad_regalo)} · {fmtDate(p.fecha_fin)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ──────────────── Main Content ──────────────── */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-10">

          {/* ═══ FORM (editing) ═══ */}
          {isEditing && editingData ? (
            <div className="max-w-4xl will-change-transform">

              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-2">
                    {editingData.id ? 'Actualizar Promoción' : 'Nueva Promoción'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                    Gestión de Catálogo de Promociones
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

                {/* ═══ Dos Columns: Info General + Vigencia ═══ */}
                <div className="grid grid-cols-2 gap-6">

                  {/* ═══ Información General ═══ */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Información General
                    </h3>
                    <div className="space-y-4">
                      {/* ── Nombre + Estado ── */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            ID Promoción
                          </label>
                          <input
                            type="text" required
                            value={editingData.nombre}
                            onChange={e => set('nombre', e.target.value)}
                            placeholder="Ej: PACK VERANO LACTEOS"
                            className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-black uppercase bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
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
                              {editingData.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Descripción ── */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Descripción de la Información
                        </label>
                        <input
                          type="text"
                          value={editingData.descripcion}
                          onChange={e => set('descripcion', e.target.value)}
                          placeholder="Ej: Especial de Verano 2024 - Lácteos"
                          className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ═══ Vigencia ═══ */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Vigencia
                    </h3>
                    <div className="space-y-4">
                      {/* Fechas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                          <input
                            type="date" required
                            value={editingData.fecha_inicio}
                            onChange={e => set('fecha_inicio', e.target.value)}
                            className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                          <input
                            type="date" required
                            value={editingData.fecha_fin}
                            onChange={e => set('fecha_fin', e.target.value)}
                            className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Duración estimada */}
                      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Duración Estimada</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white">{duracion} días</span>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-2">
                      Categoría de Aplicación
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
                    Seleccione las categorías de materiales donde se aplicará esta promoción. Deje vacío para aplicar a todas.
                  </p>
                </div>

                {/* ═══ Lleve/Pague + Canales ═══ */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    {/* ── Configuración de la Promoción ── */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Configuración de la Promoción
                      </label>
                      <div className="flex items-center gap-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900">
                        {/* LLEVE */}
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Lleve</span>
                          <div className="relative">
                            <div className="size-24 rounded-2xl border-2 border-blue-400 bg-blue-50 dark:bg-blue-500/5 flex items-center justify-center">
                              <span className="text-5xl font-black text-blue-500">{editingData.cantidad_compra}</span>
                            </div>
                            <button type="button" onClick={() => set('cantidad_compra', editingData.cantidad_compra + 1)}
                              className="absolute -top-2.5 -right-2.5 size-6 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-800 flex items-center justify-center text-sm font-black shadow hover:scale-110 transition-transform active:scale-90">+</button>
                            <button type="button" onClick={() => set('cantidad_compra', Math.max(1, editingData.cantidad_compra - 1))}
                              className="absolute -bottom-2.5 -right-2.5 size-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm font-black shadow hover:scale-110 transition-transform active:scale-90">−</button>
                          </div>
                        </div>

                        {/* Cart icon */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="size-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-2xl text-white dark:text-slate-900">shopping_cart</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Al precio de</span>
                        </div>

                        {/* PAGUE */}
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Pague</span>
                          <div className="relative">
                            <div className="size-24 rounded-2xl border-2 border-green-400 bg-green-50 dark:bg-green-500/5 flex items-center justify-center">
                              <span className="text-5xl font-black text-green-500">{editingData.cantidad_regalo}</span>
                            </div>
                            <button type="button" onClick={() => set('cantidad_regalo', Math.min(editingData.cantidad_compra - 1, editingData.cantidad_regalo + 1))}
                              className="absolute -top-2.5 -right-2.5 size-6 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-800 flex items-center justify-center text-sm font-black shadow hover:scale-110 transition-transform active:scale-90">+</button>
                            <button type="button" onClick={() => set('cantidad_regalo', Math.max(0, editingData.cantidad_regalo - 1))}
                              className="absolute -bottom-2.5 -right-2.5 size-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm font-black shadow hover:scale-110 transition-transform active:scale-90">−</button>
                          </div>
                        </div>

                        {/* Resumen */}
                        <div className="flex-1 bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-white border border-slate-800">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Resumen de Oferta</p>
                          <p className="text-xl font-black mb-2">
                            Promoción <span className="text-primary">{etiPromo}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Cliente adquiere <strong className="text-white">{editingData.cantidad_compra}</strong> unidades
                            pagando solo <strong className="text-white">{editingData.cantidad_regalo}</strong>.
                            {descuento > 0 && (
                              <> Descuento efectivo del <span className="text-green-400 font-black">{descuento}%</span>.</>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            <span>Aplica al producto de menor valor</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Restricciones de Producto ── */}
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
                          {(editingData.detalles as Partial<PromoDetalle>[]).map((d, i) => {
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
                  </div>

                  {/* ═══ Canales Disponibles ═══ */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Canales Disponibles
                    </h3>
                    <div className="space-y-2">
                      {CANALES.map(canal => {
                        const active = (editingData.canales as string[]).includes(canal.key)
                        return (
                          <label
                            key={canal.key}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border',
                              active
                                ? 'bg-primary/5 dark:bg-primary/10 border-primary/20'
                                : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                          >
                            <div className={cn(
                              'size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                              active ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                            )}>
                              {active && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                            </div>
                            <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleCanal(canal.key)} />
                            <span className={cn(
                              'text-xs font-bold transition-colors',
                              active ? 'text-slate-800 dark:text-white' : 'text-slate-500'
                            )}>
                              {canal.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* ── Save button ── */}
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

            /* ═══ DETAIL VIEW ═══ */
          ) : selected ? (
            <div className="max-w-5xl mx-auto space-y-10">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                      {selected.nombre}
                    </h2>
                    <Badge variant={selected.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
                      {selected.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm font-medium tracking-tight">
                    Promoción · {promoLabel(selected.cantidad_compra, selected.cantidad_regalo)} · {fmtDate(selected.fecha_inicio)} – {fmtDate(selected.fecha_fin)}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEditor(selected)}
                  className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Editar Promoción
                </button>
              </div>

              {/* Data Grid */}
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-10">

                  {/* Columna izq */}
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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Configuración de la Promoción</span>
                        <div className="flex items-center gap-4">
                          <div className="size-16 rounded-2xl border-2 border-blue-400 bg-blue-50 dark:bg-blue-500/5 flex items-center justify-center">
                            <span className="text-3xl font-black text-blue-500">{selected.cantidad_compra}</span>
                          </div>
                          <div className="size-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shadow">
                            <span className="material-symbols-outlined text-xl text-white dark:text-slate-900">shopping_cart</span>
                          </div>
                          <div className="size-16 rounded-2xl border-2 border-green-400 bg-green-50 dark:bg-green-500/5 flex items-center justify-center">
                            <span className="text-3xl font-black text-green-500">{selected.cantidad_regalo}</span>
                          </div>
                          <div className="flex-1 bg-slate-900 dark:bg-slate-950 rounded-xl p-3 text-white">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Resumen</p>
                            <p className="text-base font-black">
                              Promo <span className="text-primary">{promoLabel(selected.cantidad_compra, selected.cantidad_regalo)}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">Desc. efectivo: <span className="text-green-400 font-black">{calcDescuento(selected.cantidad_compra, selected.cantidad_regalo)}%</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categorías de Aplicación</span>
                        {selected.categorias && selected.categorias.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selected.categorias.map(c => (
                              <span key={c.id} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                                {c.categoria?.descripcion || `#${c.categoria_id}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-800 dark:text-white">Sin restricción de categoría</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna der */}
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                      VIGENCIA Y CANALES
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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Canales Disponibles</span>
                        <div className="space-y-2">
                          {CANALES.map(c => {
                            const on = selected.canales?.some(sc => sc.canal === c.key)
                            return (
                              <div key={c.key} className="flex items-center gap-3">
                                <div className={cn(
                                  'size-5 rounded-md flex items-center justify-center',
                                  on ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                )}>
                                  {on && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                                </div>
                                <span className={cn(
                                  'text-sm font-bold',
                                  on ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'
                                )}>{c.label}</span>
                              </div>
                            )
                          })}
                        </div>
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

            /* ═══ EMPTY STATE ═══ */
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-6xl opacity-20">campaign</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-30 leading-none mb-2">
                  Catálogo de Promociones
                </p>
                <p className="text-xs font-medium text-slate-400 italic">
                  Selecciona una promoción para visualizar sus datos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
