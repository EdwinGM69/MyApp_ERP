'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import MonedaSelect from '@/components/ui/MonedaSelect'
import IndustriaSelect from '@/components/ui/IndustriaSelect'
import SucursalesAlmacenesSection from './SucursalesAlmacenesSection'

interface Empresa {
  id?: number
  nombre: string
  nif: string
  industria_id?: number
  representante?: string | null
  email?: string | null
  telefono?: string | null
  direccion_fiscal?: string | null
  sitio_web?: string | null
  moneda_default: string
  zona_horaria: string
  logo_url?: string | null
  moneda_id?: number
}

export default function EmpresaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState<Empresa>({
    nombre: '',
    nif: '',
    industria_id: undefined,
    representante: '',
    email: '',
    telefono: '',
    direccion_fiscal: '',
    sitio_web: '',
    moneda_default: 'USD',
    zona_horaria: '(GMT-05:00) Bogotá',
    logo_url: '',
    moneda_id: undefined
  })

  useEffect(() => {
    async function fetchEmpresa() {
      try {
        const res = await apiFetch('/api/empresa')
        if (!res.ok) throw new Error('Error al cargar datos de la empresa')
        const data = await res.json()
        setFormData({
          ...data,
          industria_id: data.industria_id || undefined,
          representante: data.representante || '',
          email: data.email || '',
          telefono: data.telefono || '',
          direccion_fiscal: data.direccion_fiscal || '',
          sitio_web: data.sitio_web || '',
          logo_url: data.logo_url || ''
        })
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEmpresa()
  }, [])

  const refreshSession = useAuthStore(state => state.refreshSession)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await apiFetch('/api/empresa', {
        method: 'PUT',
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar cambios')
      }

      toast.success('Configuración de empresa actualizada')
      await refreshSession()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="text-slate-500 font-medium tracking-tight whitespace-nowrap overflow-hidden">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-slate-50/50">
      <div className="max-w-[1240px] mx-auto w-full px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de la Empresa</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Gestione la información general, identidad y parámetros regionales de su organización.</p>
          </div>
          <button
            type="submit"
            form="empresa-form"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Cambios
              </>
            )}
          </button>
        </div>

        <form id="empresa-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section: Información Básica */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500 text-xl">info</span>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Información Básica</h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre de la Empresa</label>
                  <input
                    type="text" name="nombre" required value={formData.nombre} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="Ej: Soluciones Tecnológicas S.A.S."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NIT / Tax ID</label>
                    <input
                      type="text" name="nif" required value={formData.nif} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="900.123.456-7"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Industria</label>
                    <IndustriaSelect 
                      value={formData.industria_id} 
                      onSelect={(industria) => setFormData(prev => ({ ...prev, industria_id: industria.id }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Representante Legal</label>
                  <input
                    type="text" name="representante" value={formData.representante || ''} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="Nombre del representante"
                  />
                </div>
              </div>
            </div>

            {/* Section: Datos de Contacto */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-slate-800 dark:text-white">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500 text-xl">contact_support</span>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Datos de Contacto</h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                    <input
                      type="email" name="email" value={formData.email || ''} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teléfono</label>
                    <input
                      type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>
<div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dirección Principal</label>
                    <input
                      type="text" name="direccion_fiscal" value={formData.direccion_fiscal || ''} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
                      placeholder="Calle 123 # 45-67, Ciudad"
                    />
                  </div>
                  <div className="flex bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all overflow-hidden items-center">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 tracking-tighter shrink-0 select-none">
                    https://
                  </div>
                  <input
                    type="text" name="sitio_web" value={formData.sitio_web?.replace('https://', '') || ''} 
                    onChange={(e) => setFormData(prev => ({ ...prev, sitio_web: e.target.value ? `https://${e.target.value}` : '' }))}
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm font-medium outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
                    placeholder="www.empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Section: Sucursales y Almacenes */}
            <SucursalesAlmacenesSection />

          </div>

          {/* Right Column (Sidebar Widgets) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Widget: Identidad Visual */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all mb-8">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500 text-lg">image</span>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Identidad Visual</h3>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Logo de la Empresa</p>
                <div className="group relative w-full aspect-square max-w-[200px] mx-auto bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-4 transition-all hover:border-blue-500/50">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                        <span className="material-symbols-outlined text-3xl">image</span>
                      </div>
                      <button type="button" className="text-[11px] font-black text-blue-600 uppercase tracking-tight hover:underline">Subir nuevo logo</button>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">PNG, JPG hasta 5MB</p>
                    </div>
                  )}
                  {/* Hidden Overlay for actions if logo exists */}
                  {formData.logo_url && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-2xl">
                       <button type="button" className="bg-white text-slate-900 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-lg">Cambiar</button>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/10">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 leading-none">RECOMENDACIÓN</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed tracking-tight">
                    Use un logo con fondo transparente y alta resolución (mínimo 400x400px) para asegurar una visualización profesional en facturas y reportes.
                  </p>
                </div>
              </div>
            </div>

            {/* Section: Configuración Regional */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all mb-8">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500 text-lg">public</span>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Configuración Regional</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda Defecto</label>
                  <MonedaSelect 
                    value={formData.moneda_id} 
                    onChange={(m) => setFormData(prev => ({ 
                      ...prev, 
                      moneda_id: m?.id,
                      moneda_default: m?.abreviatura || 'USD'
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Zona Horaria</label>
                  <select
                    name="zona_horaria" value={formData.zona_horaria} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="(GMT-05:00) Bogotá">(GMT-05:00) Bogotá</option>
                    <option value="(GMT-04:00) Caracas">(GMT-04:00) Caracas</option>
                    <option value="(GMT-03:00) Buenos Aires">(GMT-03:00) Buenos Aires</option>
                    <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Widget: ¿Necesitas ayuda? */}
            <div className="bg-[#0f172a] rounded-2xl p-8 text-white shadow-xl shadow-slate-900/30 overflow-hidden relative group">
              <div className="absolute -top-6 -right-6 p-8 opacity-5 group-hover:opacity-10 transition-all hover:scale-110">
                <span className="material-symbols-outlined text-[140px]">live_help</span>
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="size-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <span className="material-symbols-outlined">help</span>
                  </div>
                  <h4 className="text-base font-black tracking-tight tracking-tighter">¿Necesitas ayuda?</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-8">
                  Configura correctamente los datos fiscales para evitar errores en la facturación electrónica y cumplimiento legal.
                </p>
                <button 
                  type="button"
                  className="w-full py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  Ver Documentación
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
