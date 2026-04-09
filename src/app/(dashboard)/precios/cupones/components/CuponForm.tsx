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

interface CuponDetalle {
  id?: number
  material_id: number
  material?: Material
}

interface Cupon {
  id: number
  codigo_cupon: string
  codigo: string
  tipo: string
  valor: number
  moneda: string
  limite_uso?: number | null
  usos_actuales: number
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
  detalles?: CuponDetalle[]
  created_at?: string
  updated_at?: string
  creador?: { nombre: string }
  actualizador?: { nombre: string }
}

interface CuponFormProps {
  cuponToEdit?: Cupon | null
}

export default function CuponForm({ cuponToEdit }: CuponFormProps) {
  const router = useRouter()
  const isEditing = !!cuponToEdit
  const [saving, setSaving] = useState(false)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [mounted, setMounted] = useState(false)

  // Form state
  const [codigoCupon, setCodigoCupon] = useState(cuponToEdit?.codigo_cupon ?? '')
  const [descripcion, setDescripcion] = useState(cuponToEdit?.codigo ?? '')
  const [tipo, setTipo] = useState(cuponToEdit?.tipo ?? 'PORCENTAJE')
  const [valor, setValor] = useState(cuponToEdit?.valor ? String(cuponToEdit.valor) : '')
  const [moneda, setMoneda] = useState(cuponToEdit?.moneda ?? 'USD')
  const [isLimitado, setIsLimitado] = useState(cuponToEdit?.limite_uso !== null ? 'Limitado' : 'Ilimitado')
  const [limiteUso, setLimiteUso] = useState(cuponToEdit?.limite_uso ? String(cuponToEdit.limite_uso) : '')
  const [activo, setActivo] = useState(cuponToEdit?.activo ?? true)
  const [fechaInicio, setFechaInicio] = useState(cuponToEdit?.fecha_inicio ? cuponToEdit.fecha_inicio.split('T')[0] : '')
  const [fechaFin, setFechaFin] = useState(cuponToEdit?.fecha_fin ? cuponToEdit.fecha_fin.split('T')[0] : '')
  const [detallesLineas, setDetallesLineas] = useState<Partial<CuponDetalle>[]>(cuponToEdit?.detalles || [])

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
    if (!cuponToEdit) {
      setCodigoCupon(`CPN-${new Date().getFullYear()}-00${Math.floor(Math.random() * 100)}`)
      setFechaInicio(new Date().toISOString().split('T')[0])
    }
  }, [fetchMateriales, cuponToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: cuponToEdit?.id,
      codigo_cupon: codigoCupon,
      codigo: descripcion.toUpperCase(),
      tipo,
      valor: Number(valor),
      moneda,
      limite_uso: isLimitado === 'Limitado' ? Number(limiteUso) : null,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || null,
      activo,
      detalles: detallesLineas.filter(d => d.material_id).map(d => ({ material_id: Number(d.material_id) }))
    }

    try {
      const res = await apiFetch('/api/precios/cupones', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(isEditing ? 'Cupón actualizado correctamente' : 'Cupón creado correctamente')
      router.push('/precios/cupones')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addLinea = () => {
    setDetallesLineas([...detallesLineas, { material_id: 0 }])
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
            onClick={() => router.push('/precios/cupones')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Tarifarios</span>
              <span className="text-[8px]">/</span>
              <span>Gestión de Cupones</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Editar Cupón' : 'Registro de Datos de Cupón'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="cupon-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isEditing ? 'Guardar Cambios' : 'Guardar Cupón'}
              </>
            )}
          </button>
        </div>
      </div>

      <form id="cupon-form" onSubmit={handleSubmit} className="max-w-[1200px] mx-auto w-full space-y-8 pb-10">
        <p className="text-sm text-slate-500 mb-4 px-2">Complete la información detallada para registrar un nuevo cupón de descuento en el sistema.</p>

        {/* 1. Información del Cupón */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-[20px]">local_activity</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Información del Cupón</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">ID CUPÓN</label>
              <input
                type="text" disabled
                value={codigoCupon}
                className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-500 outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">DESCRIPCIÓN / CÓDIGO</label>
              <input
                type="text" required
                value={descripcion}
                onChange={e => setDescripcion(e.target.value.toUpperCase())}
                placeholder="EJ: DESCUENTO CYBERWOW 2024"
                className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">TIPO CUPÓN</label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none [background-image:none] pr-10"
                >
                  <option value="PORCENTAJE">Porcentaje (%)</option>
                  <option value="MONTO FIJO">Monto Fijo</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">VALOR</label>
              <input
                type="number" step="0.01" required
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0.00"
                className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">MONEDA</label>
              <div className="relative">
                <select
                  value={moneda}
                  onChange={e => setMoneda(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none [background-image:none] pr-10"
                >
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
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

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LÍMITE DE USO</label>
              <div className="relative">
                <select
                  value={isLimitado}
                  onChange={e => setIsLimitado(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none [background-image:none] pr-10"
                >
                  <option value="Limitado">Limitado</option>
                  <option value="Ilimitado">Ilimitado</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>

            {isLimitado === 'Limitado' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CANTIDAD LÍMITE</label>
                <input
                  type="number" required
                  value={limiteUso}
                  onChange={e => setLimiteUso(e.target.value)}
                  placeholder="100"
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>
            )}
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

        {/* 3. Líneas de Productos */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">list_alt</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Líneas de Productos</h3>
            </div>
            <button
              type="button"
              onClick={addLinea}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Añadir Línea
            </button>
          </div>

          <div className="p-8">
            {detallesLineas.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código Producto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio Base</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moneda</th>
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
                              {mat ? Number(mat.precio_venta).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-400 text-center">
                              {mat?.moneda || '--'}
                            </div>
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
                <p className="text-sm font-medium text-slate-400">Aún no hay productos asociados a este cupón.</p>
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
                {isEditing ? formatAuditDate(cuponToEdit?.created_at) : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">USUARIO CREACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing ? (cuponToEdit?.creador?.nombre || 'SISTEMA') : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA MODIFICACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing ? formatAuditDate(cuponToEdit?.updated_at) : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">USUARIO MODIFICACIÓN</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-400 h-[50px] flex items-center">
                {isEditing && cuponToEdit?.updated_at ? (cuponToEdit?.actualizador?.nombre || '-') : '--'}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
