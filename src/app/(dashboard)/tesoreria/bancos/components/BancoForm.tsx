'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Switch from '@/components/ui/Switch'
import PaisSelect from '@/components/ui/PaisSelect'
import Topbar from '@/components/layout/Topbar'
import { cn } from '@/lib/utils'

interface Pais {
  id: number
  descripcion: string
}

interface Banco {
  id: number
  codigo: string
  descripcion: string
  pais_id?: number | null
  codigo_swift?: string | null
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
  pais?: { id: number, descripcion: string }
  tipos_cuenta?: { id: number, descripcion: string }[]
}

interface BancoFormProps {
  bancoToEdit?: Banco
}

export default function BancoForm({ bancoToEdit }: BancoFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [paises, setPaises] = useState<Pais[]>([])
  const [mounted, setMounted] = useState(false)

  // Form State
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [paisId, setPaisId] = useState<number | string>('')
  const [codigoSwift, setCodigoSwift] = useState('')
  const [activo, setActivo] = useState(true)
  const [tiposCuenta, setTiposCuenta] = useState<{ id?: number, descripcion: string }[]>([])
  const [newTipoCuenta, setNewTipoCuenta] = useState('')

  useEffect(() => {
    fetchPaises()
    if (bancoToEdit) {
      setCodigo(bancoToEdit.codigo || '')
      setDescripcion(bancoToEdit.descripcion || '')
      setPaisId(bancoToEdit.pais_id || '')
      setCodigoSwift(bancoToEdit.codigo_swift || '')
      setActivo(bancoToEdit.activo ?? true)
      setTiposCuenta(bancoToEdit.tipos_cuenta || [])
    }
    setMounted(true)
  }, [bancoToEdit])

  const fetchPaises = async () => {
    try {
      const res = await apiFetch('/api/logistica/paises?pageSize=100')
      const json = await res.json()
      setPaises(json.data || [])
    } catch (error) {
      console.error('Error fetching countries', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: bancoToEdit?.id,
      codigo,
      descripcion,
      pais_id: paisId ? Number(paisId) : null,
      codigo_swift: codigoSwift || null,
      activo,
      tipos_cuenta: tiposCuenta
    }

    try {
      const res = await apiFetch('/api/tesoreria/bancos', {
        method: bancoToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(bancoToEdit ? 'Banco actualizado' : 'Banco creado')
      router.push('/tesoreria/bancos')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const addTipoCuenta = () => {
    if (!newTipoCuenta.trim()) return
    setTiposCuenta([...tiposCuenta, { descripcion: newTipoCuenta.trim() }])
    setNewTipoCuenta('')
  }

  const removeTipoCuenta = (index: number) => {
    setTiposCuenta(tiposCuenta.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
      <Topbar title="Gestión de Bancos" />
      {/* Premium Sticky Header */}
      <div className="sticky top-16 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 px-8 flex items-center justify-between shadow-sm tracking-tight transition-all">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/tesoreria/bancos')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Tesorería</span>
              <span className="text-[8px]">/</span>
              <span>Gestión de Bancos</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {bancoToEdit ? 'Editar Banco' : 'Registro de Banco'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Gestione las entidades bancarias para sus operaciones financieras.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="banco-form"
            type="submit"
            disabled={saving}
            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Guardar Banco
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-8 py-6">
        <form id="banco-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Código</label>
                    <input
                      type="text" required value={codigo} onChange={e => setCodigo(e.target.value)}
                      disabled={!!bancoToEdit}
                      className={cn(
                        "w-full px-6 py-2 border rounded-xl text-base font-medium outline-none transition-all font-mono placeholder:text-slate-400",
                        bancoToEdit
                          ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                      )}
                      placeholder="Ej: BCP"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Descripción / Nombre</label>
                    <input
                      type="text" required value={descripcion} onChange={e => setDescripcion(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ej: Banco de Crédito del Perú"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">País</label>
                    <PaisSelect
                      value={paisId ? Number(paisId) : undefined}
                      onChange={(p) => setPaisId(p?.id || '')}
                      placeholder="Seleccione un país"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Código SWIFT</label>
                    <input
                      type="text" value={codigoSwift} onChange={e => setCodigoSwift(e.target.value)}
                      className="w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono placeholder:text-slate-400"
                      placeholder="Ej: CRBPPELM"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Card */}
            <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validación de Registro</label>
                <p className="text-xs text-slate-500 font-medium">Asegúrese que el código y la descripción sean únicos para su empresa.</p>
              </div>
            </div>

            {/* Account Types Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Cuentas de Banco</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Tipos de cuenta que la entidad ofrece.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTipoCuenta}
                    onChange={e => setNewTipoCuenta(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTipoCuenta();
                      }
                    }}
                    placeholder="Ej: Ahorros, Corriente..."
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-11 w-full md:w-56"
                  />
                  <button
                    type="button"
                    onClick={addTipoCuenta}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-90 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tiposCuenta.map((tc, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group hover:border-blue-200 dark:hover:border-blue-500/30 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{tc.descripcion}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTipoCuenta(index)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
                {tiposCuenta.length === 0 && (
                  <div className="md:col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/20">
                    <div className="w-16 h-16 rounded-full bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                      <span className="material-symbols-outlined text-[32px] font-light">account_balance_wallet</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center">No hay tipos registrados</p>
                    <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Use el campo superior para añadir tipos de cuenta</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Estado del Registro</label>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    activo ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", activo ? "text-slate-800 dark:text-white" : "text-slate-400")}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <Switch checked={activo} onChange={setActivo} />
              </div>
            </div>

            {/* Audit Card */}
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
                      {bancoToEdit?.usuario_creador?.nombre || '--'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {mounted && bancoToEdit?.created_at ? format(new Date(bancoToEdit.created_at), 'dd MMM, hh:mm aa') : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-slate-100/50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-300">history</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Última modificación</label>
                    {bancoToEdit?.usuario_modificador?.nombre ? (
                      <>
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{bancoToEdit.usuario_modificador.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {mounted && bancoToEdit.updated_at ? format(new Date(bancoToEdit.updated_at), 'dd MMM, hh:mm aa') : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-slate-400 italic">Sin cambios registrados</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tip Card */}
            <div className="bg-[#0f172a] rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20 group hover:scale-[1.02] transition-all cursor-default overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all rotate-12">
                <span className="material-symbols-outlined text-[100px]">account_balance</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-blue-400 text-[20px]">lightbulb</span>
                  <h4 className="text-xs font-black uppercase tracking-wider">Tip Pro</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Defina correctamente el código SWIFT si realiza transferencias internacionales frecuentes.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
