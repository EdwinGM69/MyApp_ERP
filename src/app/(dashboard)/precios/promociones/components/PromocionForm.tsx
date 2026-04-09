'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Material {
  id: number
  codigo: string
  descripcion: string
  precio_venta: number
  moneda: string
}

interface PromocionDetalle {
  id?: number
  material_id: number
  tipo_promocion?: string | null
  tipo_descuento?: string | null
  valor?: number | null
  material?: Material
}

interface Promocion {
  id: number
  codigo_promocion: string
  nombre: string
  descripcion?: string | null
  tipo: string
  fecha_inicio: string
  fecha_fin?: string | null
  activo: boolean
  detalles?: PromocionDetalle[]
  created_at?: string
  updated_at?: string
  creador?: { nombre: string }
  actualizador?: { nombre: string }
}

interface PromocionFormProps {
  promocionToEdit?: Promocion | null
}

export default function PromocionForm({ promocionToEdit }: PromocionFormProps) {
  const router = useRouter()
  const isEditing = !!promocionToEdit
  const [saving, setSaving] = useState(false)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [mounted, setMounted] = useState(false)

  // Form state
  const [codigoPromocion, setCodigoPromocion] = useState(promocionToEdit?.codigo_promocion ?? '')
  const [nombre, setNombre] = useState(promocionToEdit?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(promocionToEdit?.descripcion ?? '')
  const [tipo, setTipo] = useState(promocionToEdit?.tipo ?? 'Descuento %')
  const [activo, setActivo] = useState(promocionToEdit?.activo ?? true)
  const [fechaInicio, setFechaInicio] = useState(promocionToEdit?.fecha_inicio ? promocionToEdit.fecha_inicio.split('T')[0] : '')
  const [fechaFin, setFechaFin] = useState(promocionToEdit?.fecha_fin ? promocionToEdit.fecha_fin.split('T')[0] : '')
  const [detallesLineas, setDetallesLineas] = useState<Partial<PromocionDetalle>[]>(promocionToEdit?.detalles || [])

  const fetchMateriales = useCallback(async () => {
    try {
      const res = await apiFetch('/api/materiales?limit=1000')
      const json = await res.json()
      setMateriales(json.data ?? [])
    } catch (error) {
      console.error('Error al cargar materiales:', error)
    }
  }, [])

  useEffect(() => {
    fetchMateriales()
    setMounted(true)
    if (!promocionToEdit) {
      setCodigoPromocion(`PROM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`)
      setFechaInicio(new Date().toISOString().split('T')[0])
    }
  }, [fetchMateriales, promocionToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: promocionToEdit?.id,
      codigo_promocion: codigoPromocion,
      nombre,
      descripcion: descripcion || null,
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || null,
      activo,
      detalles: detallesLineas.filter(d => d.material_id).map(d => ({
        material_id: Number(d.material_id),
        tipo_promocion: d.tipo_promocion || 'Descuento',
        tipo_descuento: d.tipo_descuento || 'Porcentaje',
        valor: d.valor ? Number(d.valor) : 0
      }))
    }

    try {
      const res = await apiFetch('/api/precios/promociones', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(isEditing ? 'Promoción actualizada correctamente' : 'Promoción creada correctamente')
      router.push('/precios/promociones')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addLinea = () => {
    setDetallesLineas([...detallesLineas, { material_id: 0, tipo_promocion: 'Descuento', tipo_descuento: 'Porcentaje', valor: 0 }])
  }

  const updateLinea = (index: number, field: string, value: any) => {
    const newLineas = [...detallesLineas]
    newLineas[index] = { ...newLineas[index], [field]: value }
    setDetallesLineas(newLineas)
  }

  const removeLinea = (index: number) => {
    const newLineas = [...detallesLineas]
    newLineas.splice(index, 1)
    setDetallesLineas(newLineas)
  }

  const formatAuditDate = (dateString?: string) => {
    if (!dateString) return '--'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch {
      return '--'
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Premium Sticky Header */}
      <div className="sticky top-[-32px] z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 mb-8 -mt-8 -mx-8 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/precios/promociones')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Tarifarios</span>
              <span className="text-[8px]">/</span>
              <span>Gestión de Promociones</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Editar Promoción' : 'Registro de Datos de Promoción'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="promocion-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isEditing ? 'Guardar Cambios' : 'Guardar Promoción'}
              </>
            )}
          </button>
        </div>
      </div>

      <form id="promocion-form" onSubmit={handleSubmit} className="max-w-[1200px] mx-auto w-full space-y-8 pb-10">
        <p className="text-sm text-slate-500 mb-4 px-2">Complete la información detallada para configurar las campañas y ofertas activas en el sistema POS.</p>

        {/* 1. Información General */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Información General</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">ID PROMO</label>
              <input
                type="text" disabled
                value={codigoPromocion}
                className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-500 outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">NOMBRE DE PROMOCIÓN</label>
              <input
                type="text" required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="EJ: PACK ANIVERSARIO - VERANO"
                className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2">ESTADO</label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                  />
                  <div className={cn(
                    "block w-12 h-7 rounded-full transition-all duration-300 shadow-inner",
                    activo ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  )}></div>
                  <div className={cn(
                    "absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm",
                    activo ? "translate-x-5" : "translate-x-0"
                  )}></div>
                </div>
                <span className={cn(
                  "text-sm font-bold transition-colors",
                  activo ? "text-emerald-600" : "text-slate-400"
                )}>
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">DESCRIPCIÓN</label>
              <input
                type="text"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Breve detalle del alcance de la oferta..."
                className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">TIPO PROMOCIÓN</label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none [background-image:none] pr-10"
                >
                  <option value="Descuento %">Descuento %</option>
                  <option value="2x1">2x1</option>
                  <option value="3x2">3x2</option>
                  <option value="Combo">Combo</option>
                  <option value="Envío Gratis">Envío Gratis</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Vigencia */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600">
              <span className="material-symbols-outlined text-[20px]">event</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Vigencia</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA INICIO</label>
              <div className="relative">
                <input
                  type="date" required
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-12"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA FINAL</label>
              <div className="relative">
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-12"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Líneas de Promoción */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">list_alt</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Líneas de Promoción</h3>
            </div>
            <button
              type="button"
              onClick={addLinea}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-sm uppercase tracking-wide"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Añadir Línea
            </button>
          </div>

          <div className="p-8">
            {detallesLineas.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Producto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio Base</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo Promoción</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo Descuento</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detallesLineas.map((linea, idx) => {
                      const mat = materiales.find(m => m.id === Number(linea.material_id)) || linea.material
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="relative">
                              <select
                                value={linea.material_id || ''}
                                onChange={(e) => updateLinea(idx, 'material_id', e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium appearance-none [background-image:none] pr-10 focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="">Seleccione un material...</option>
                                {materiales.map(m => (
                                  <option key={m.id} value={m.id}>[{m.codigo}] {m.descripcion}</option>
                                ))}
                              </select>
                              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-400">
                              {mat ? Number(mat.precio_venta).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'} {mat?.moneda}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <select
                                value={linea.tipo_promocion || 'Descuento'}
                                onChange={(e) => updateLinea(idx, 'tipo_promocion', e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium appearance-none [background-image:none] pr-10 focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="Descuento">Descuento</option>
                                <option value="Paga">Paga</option>
                                <option value="Regalo">Regalo</option>
                              </select>
                              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <select
                                value={linea.tipo_descuento || 'Porcentaje'}
                                onChange={(e) => updateLinea(idx, 'tipo_descuento', e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium appearance-none [background-image:none] pr-10 focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="Porcentaje">Porcentaje (%)</option>
                                <option value="Monto Fijo">Monto Fijo</option>
                              </select>
                              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number" step="0.01"
                              value={linea.valor !== null && linea.valor !== undefined ? linea.valor : ''}
                              onChange={(e) => updateLinea(idx, 'valor', e.target.value)}
                              placeholder="0.00"
                              className="w-32 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeLinea(idx)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                  <span className="material-symbols-outlined text-[24px]">inbox</span>
                </div>
                <p className="text-sm font-medium text-slate-400">Aún no hay líneas de productos configuradas para esta promoción.</p>
                <button
                  type="button"
                  onClick={addLinea}
                  className="mt-4 text-blue-600 text-xs font-bold hover:underline"
                >
                  Presione aquí para añadir una línea
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Auditoría */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Auditoría</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA CREACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing ? formatAuditDate(promocionToEdit?.created_at) : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">USUARIO CREACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing ? (promocionToEdit?.creador?.nombre || 'SISTEMA') : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA MODIFICACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing ? formatAuditDate(promocionToEdit?.updated_at) : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">USUARIO MODIFICACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing && promocionToEdit?.updated_at ? (promocionToEdit?.actualizador?.nombre || '-') : '--'}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
