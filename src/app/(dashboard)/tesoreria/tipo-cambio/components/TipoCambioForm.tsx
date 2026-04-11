'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Moneda {
  id: number
  descripcion: string
  abreviatura: string
  simbolo: string
}

interface TipoCambioFuente {
  id: number
  nombre: string
}

interface TipoCambio {
  id: number
  moneda_base: number
  moneda_cotizada: number
  precio_compra: string
  precio_venta: string
  fuente_id?: number
  fecha_publicacion?: string
  inicio_vigencia?: string
  fin_vigencia?: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
  moneda_base_rel?: Moneda
  moneda_cotizada_rel?: Moneda
}

interface TipoCambioFormProps {
  tipoCambioToEdit?: TipoCambio
}

export default function TipoCambioForm({ tipoCambioToEdit }: TipoCambioFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [monedas, setMonedas] = useState<Moneda[]>([])
  const [fuentes, setFuentes] = useState<TipoCambioFuente[]>([])

  const [monedaBase, setMonedaBase] = useState<number>(0)
  const [monedaCotizada, setMonedaCotizada] = useState<number>(0)
  const [precioCompra, setPrecioCompra] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [fuenteId, setFuenteId] = useState<number | undefined>()
  const [fechaPublicacion, setFechaPublicacion] = useState('')
  const [inicioVigencia, setInicioVigencia] = useState('')
  const [finVigencia, setFinVigencia] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [monedasRes, fuentesRes] = await Promise.all([
          apiFetch('/api/monedas?page=1&pageSize=1000'),
          apiFetch('/api/tipo-cambio-fuente?page=1&pageSize=1000'),
        ])
        const monedasJson = await monedasRes.json()
        const fuentesJson = await fuentesRes.json()
        setMonedas(monedasJson.data || [])
        setFuentes(fuentesJson.data || [])

        // Default dates for new records
        if (!tipoCambioToEdit) {
          const today = new Date().toISOString().split('T')[0]
          setFechaPublicacion(today)
          setInicioVigencia(today)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (tipoCambioToEdit) {
      setMonedaBase(tipoCambioToEdit.moneda_base)
      setMonedaCotizada(tipoCambioToEdit.moneda_cotizada)
      setPrecioCompra(tipoCambioToEdit.precio_compra)
      setPrecioVenta(tipoCambioToEdit.precio_venta)
      setFuenteId(tipoCambioToEdit.fuente_id)
      setFechaPublicacion(tipoCambioToEdit.fecha_publicacion ? tipoCambioToEdit.fecha_publicacion.split('T')[0] : '')
      setInicioVigencia(tipoCambioToEdit.inicio_vigencia ? tipoCambioToEdit.inicio_vigencia.split('T')[0] : '')
      setFinVigencia(tipoCambioToEdit.fin_vigencia ? tipoCambioToEdit.fin_vigencia.split('T')[0] : '')
    }
    setMounted(true)
  }, [tipoCambioToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: tipoCambioToEdit?.id,
      moneda_base: monedaBase,
      moneda_cotizada: monedaCotizada,
      precio_compra: Number(precioCompra),
      precio_venta: Number(precioVenta),
      fuente_id: fuenteId,
      fecha_publicacion: fechaPublicacion ? new Date(fechaPublicacion).toISOString() : undefined,
      inicio_vigencia: inicioVigencia ? new Date(inicioVigencia).toISOString() : undefined,
      fin_vigencia: finVigencia ? new Date(finVigencia).toISOString() : undefined,
    }

    try {
      const res = await apiFetch('/api/tipo-cambio', {
        method: tipoCambioToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        if (Array.isArray(json.error)) {
          throw new Error(json.error.map((e: any) => e.message).join(' - '))
        }
        throw new Error(typeof json.error === 'string' ? json.error : 'Error al guardar')
      }

      toast.success(tipoCambioToEdit ? 'Tipo de cambio actualizado' : 'Tipo de cambio creado')
      router.push('/tesoreria/tipo-cambio')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-slate-50/50">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 px-8 flex items-center justify-between shadow-sm tracking-tight transition-all">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/tesoreria/tipo-cambio')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Tesorería</span>
              <span className="text-[8px]">/</span>
              <span>Tipo de Cambio</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {tipoCambioToEdit ? 'Editar Tipo de Cambio' : 'Registro de Tipo de Cambio'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Gestione los tipos de cambio para las transacciones financieras de su empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="tipo-cambio-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Tipo de Cambio
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-8 py-6">
        <form id="tipo-cambio-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Moneda Base</label>
                    <select
                      required
                      value={monedaBase}
                      onChange={e => setMonedaBase(Number(e.target.value))}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!tipoCambioToEdit}
                    >
                      <option value="">Seleccionar moneda base</option>
                      {monedas.map(m => (
                        <option key={m.id} value={m.id}>{m.abreviatura} - {m.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Moneda Cotizada</label>
                    <select
                      required
                      value={monedaCotizada}
                      onChange={e => setMonedaCotizada(Number(e.target.value))}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!tipoCambioToEdit}
                    >
                      <option value="">Seleccionar moneda cotizada</option>
                      {monedas.map(m => (
                        <option key={m.id} value={m.id}>{m.abreviatura} - {m.descripcion}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Precio Compra</label>
                    <input
                      type="number"
                      required
                      step="0.00001"
                      min="0"
                      value={precioCompra}
                      onChange={e => setPrecioCompra(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ej: 1.00000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Precio Venta</label>
                    <input
                      type="number"
                      required
                      step="0.00001"
                      min="0"
                      value={precioVenta}
                      onChange={e => setPrecioVenta(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ej: 1.00000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Fuente</label>
                    <input
                      type="text"
                      value=""
                      readOnly
                      placeholder="No aplica"
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none cursor-not-allowed italic text-slate-400"
                      disabled={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Fecha Publicación</label>
                    <input
                      type="date"
                      value={fechaPublicacion}
                      onChange={e => setFechaPublicacion(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!tipoCambioToEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Inicio Vigencia</label>
                    <input
                      type="date"
                      value={inicioVigencia}
                      onChange={e => setInicioVigencia(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!tipoCambioToEdit}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Fin Vigencia</label>
                    <input
                      type="date"
                      value={finVigencia}
                      onChange={e => setFinVigencia(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed italic"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">Validación de Registro</h4>
                <p className="text-xs text-slate-500 font-medium">Asegúrese que las monedas base y cotizada sean diferentes.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Estado del Registro</label>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                    Vigente
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Auditoría</label>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                    <span className="material-symbols-outlined text-slate-400">person</span>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Creado por</label>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {tipoCambioToEdit?.usuario_creador?.nombre || '--'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {mounted && tipoCambioToEdit?.created_at ? format(new Date(tipoCambioToEdit.created_at), 'dd MMM, hh:mm aa') : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100/50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-300">history</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Última modificación</label>
                    {tipoCambioToEdit?.usuario_modificador?.nombre ? (
                      <>
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{tipoCambioToEdit.usuario_modificador.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                           {mounted && tipoCambioToEdit.updated_at ? format(new Date(tipoCambioToEdit.updated_at), 'dd MMM, hh:mm aa') : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-slate-400 italic">Sin cambios registrados</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20 group hover:scale-[1.02] transition-all cursor-default overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all rotate-12">
                <span className="material-symbols-outlined text-[100px]">currency_exchange</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-blue-400 text-[20px]">lightbulb</span>
                  <h4 className="text-xs font-black uppercase tracking-wider">Tip Pro</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Configure precios de compra y venta para gestionar el margen cambiario de su empresa.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
