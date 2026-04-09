'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import IndustriaSelect from '@/components/ui/IndustriaSelect'
import DocumentoIdentificacionSelect from '@/components/ui/DocumentoIdentificacionSelect'
import BancoSelect, { Banco } from '@/components/ui/BancoSelect'
import { cn } from '@/lib/utils'

interface Proveedor {
  id: number
  codigo: string
  tipo: string
  tipo_proveedor: string
  nombre: string
  categoria?: string
  industria_id?: number
  tipo_nif_id?: number
  tipo_nif?: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  banco_id?: number
  banco?: string
  tipo_cuenta?: string
  tipo_cuenta_id?: number | null
  tipo_cuenta_rel?: { id: number, descripcion: string }
  banco_cuenta?: string
  banco_swift?: string
  banco_titular?: string
  activo: boolean
  creator_name?: string
  updater_name?: string
  created_at?: string
  updated_at?: string
}

interface Movimiento {
  id: number
  tipo: string
  fecha: string
  referencia: string
  monto: number
  estado: string
}

interface ProveedorFormProps {
  proveedorToEdit?: Proveedor
}

export default function ProveedorForm({ proveedorToEdit }: ProveedorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [tipo, setTipo] = useState('empresa')
  const [tipoProveedor, setTipoProveedor] = useState('Nacional')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [industriaId, setIndustriaId] = useState<number | undefined>(undefined)
  const [tipoNifId, setTipoNifId] = useState<number | undefined>(undefined)
  const [tipoNif, setTipoNif] = useState('')
  const [nif, setNif] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [activo, setActivo] = useState(true)

  // Bank info
  const [bancoId, setBancoId] = useState<number | undefined>(undefined)
  const [banco, setBanco] = useState('')
  const [tipoCuentaId, setTipoCuentaId] = useState<number | undefined>(undefined)
  const [tipoCuenta, setTipoCuenta] = useState('')
  const [disponiblesTiposCuenta, setDisponiblesTiposCuenta] = useState<{id: number, descripcion: string}[]>([])
  const [bancoCuenta, setBancoCuenta] = useState('')
  const [bancoSwift, setBancoSwift] = useState('')
  const [bancoTitular, setBancoTitular] = useState('')

  // History state
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loadingMovs, setLoadingMovs] = useState(false)

  useEffect(() => {
    if (proveedorToEdit) {
      setTipo(proveedorToEdit.tipo)
      setTipoProveedor(proveedorToEdit.tipo_proveedor)
      setCodigo(proveedorToEdit.codigo)
      setNombre(proveedorToEdit.nombre)
      setCategoria(proveedorToEdit.categoria || '')
      setIndustriaId(proveedorToEdit.industria_id)
      setTipoNifId(proveedorToEdit.tipo_nif_id)
      setTipoNif(proveedorToEdit.tipo_nif || '')
      setNif(proveedorToEdit.nif || '')
      setEmail(proveedorToEdit.email || '')
      setTelefono(proveedorToEdit.telefono || '')
      setDireccion(proveedorToEdit.direccion || '')
      setActivo(proveedorToEdit.activo)

      setBancoId(proveedorToEdit.banco_id)
      setBanco(proveedorToEdit.banco || '')
      setTipoCuentaId(proveedorToEdit.tipo_cuenta_id || undefined)
      setTipoCuenta(proveedorToEdit.tipo_cuenta || '')
      
      // @ts-ignore
      if (proveedorToEdit.banco_entidad?.tipos_cuenta) {
        // @ts-ignore
        setDisponiblesTiposCuenta(proveedorToEdit.banco_entidad.tipos_cuenta)
      }

      setBancoCuenta(proveedorToEdit.banco_cuenta || '')
      setBancoSwift(proveedorToEdit.banco_swift || '')
      setBancoTitular(proveedorToEdit.banco_titular || '')

      // We don't have a movements API yet, placeholder
      setMovimientos([])
    }
  }, [proveedorToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      id: proveedorToEdit?.id,
      codigo,
      tipo,
      tipo_proveedor: tipoProveedor,
      nombre,
      categoria,
      industria_id: industriaId,
      tipo_nif_id: tipoNifId,
      tipo_nif: tipoNif,
      nif,
      email,
      telefono,
      direccion,
      activo,
      banco_id: bancoId,
      banco,
      tipo_cuenta_id: tipoCuentaId,
      tipo_cuenta: tipoCuenta,
      banco_cuenta: bancoCuenta,
      banco_swift: bancoSwift,
      banco_titular: bancoTitular
    }

    try {
      const res = await apiFetch('/api/proveedores', {
        method: proveedorToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        let errorMsg = 'Error al guardar'
        if (json.error) {
          errorMsg = json.error
        } else if (json.message) {
          errorMsg = json.message
        }
        throw new Error(errorMsg)
      }

      toast.success(proveedorToEdit ? 'Proveedor actualizado' : 'Proveedor creado')
      router.push('/maestros/proveedores')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columnsMovs = [
    { key: 'fecha', header: 'FECHA', render: (m: Movimiento) => format(new Date(m.fecha), 'dd/MM/yyyy', { locale: es }) },
    { key: 'tipo', header: 'TIPO', render: (m: Movimiento) => <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{m.tipo}</span> },
    { key: 'referencia', header: 'REFERENCIA', render: (m: Movimiento) => <span className="text-blue-600 font-medium">{m.referencia}</span> },
    { key: 'monto', header: 'MONTO', render: (m: Movimiento) => <span className="font-bold">${Number(m.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span> },
    {
      key: 'estado', header: 'ESTADO',
      render: (m: Movimiento) => (
        <Badge variant={m.estado === 'completado' ? 'success' : m.estado === 'pendiente' ? 'neutral' : 'error'}>
          {m.estado.charAt(0).toUpperCase() + m.estado.slice(1)}
        </Badge>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1">
      {/* Premium Sticky Header */}
      <div className="sticky top-[-32px] z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 mb-8 -mt-8 -mx-8 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/maestros/proveedores')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Maestros</span>
              <span className="text-[8px]">/</span>
              <span>Catálogo de Proveedores</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {proveedorToEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="proveedor-form"
            type="submit"
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
      </div>

      <form id="proveedor-form" onSubmit={handleSubmit} className="max-w-[1200px] mx-auto w-full space-y-6 pb-20">

        {/* Identity Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">domain</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Información de Identidad</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Proveedor</label>
              <select
                value={tipoProveedor}
                onChange={e => setTipoProveedor(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
              >
                <option value="Nacional">Nacional</option>
                <option value="Internacional">Internacional</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código</label>
              <input
                type="text" required value={codigo} onChange={e => setCodigo(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="PROV-001"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Razón Social</label>
              <input
                type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="Nombre de la empresa"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
              <IndustriaSelect
                value={industriaId}
                onSelect={(ind) => setIndustriaId(ind.id)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Entidad</label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none [background-image:none] pr-10"
                >
                  <option value="empresa">Empresa / Jurídica</option>
                  <option value="natural">Persona Natural</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents and Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">contact_phone</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Documentos y Contacto</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo NIF</label>
              <DocumentoIdentificacionSelect
                value={tipoNifId}
                onSelect={(doc) => {
                  setTipoNifId(doc.id)
                  setTipoNif(doc.abreviatura)
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Número NIF</label>
              <input
                type="text" value={nif} onChange={e => setNif(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="000.000.000-0"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="contacto@proveedor.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
              <input
                type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="+57 300 000 0000"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dirección Fiscal / Oficina</label>
              <input
                type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="Calle 123 #45-67, Ciudad"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">account_balance</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Información Bancaria</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Banco</label>
              <BancoSelect
                value={bancoId}
                onChange={(b) => {
                  setBancoId(b?.id)
                  setBanco(b?.descripcion || '')
                  if (b?.codigo_swift) setBancoSwift(b.codigo_swift)
                  
                  // Handle account types
                  if (b?.tipos_cuenta) {
                    setDisponiblesTiposCuenta(b.tipos_cuenta)
                  } else {
                    setDisponiblesTiposCuenta([])
                  }
                  setTipoCuentaId(undefined)
                  setTipoCuenta('')
                }}
                placeholder="Seleccione..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Cuenta</label>
              <div className="relative">
                <select
                  value={tipoCuentaId || ''} 
                  onChange={e => {
                    const id = e.target.value ? Number(e.target.value) : undefined
                    setTipoCuentaId(id)
                    const desc = disponiblesTiposCuenta.find(t => t.id === id)?.descripcion || ''
                    setTipoCuenta(desc)
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none [background-image:none] pr-10"
                >
                  <option value="">Seleccione...</option>
                  {disponiblesTiposCuenta.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Número de Cuenta</label>
              <input
                type="text" value={bancoCuenta} onChange={e => setBancoCuenta(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="000-000000-00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Titular de la Cuenta</label>
              <input
                type="text" value={bancoTitular} onChange={e => setBancoTitular(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="Nombre completo del titular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">SWIFT / BIC</label>
              <input
                type="text" value={bancoSwift} onChange={e => setBancoSwift(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="Código SWIFT"
              />
            </div>
          </div>
        </div>

        {/* History of Supplies */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[300px]">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-xl">inventory_2</span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Historial de Suministros</h3>
            </div>
            <button type="button" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95">
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              Exportar a PDF
            </button>
          </div>
          <div className="p-0">
            <DataTable
              columns={columnsMovs}
              data={movimientos}
              loading={loadingMovs}
              emptyMessage="No se registran movimientos para este proveedor"
            />
            {movimientos.length > 0 && (
              <div className="p-4 text-center border-t border-slate-50 dark:border-slate-800">
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-2">Ver historial completo</button>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER AUDITORIA */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-[20px]">history</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creado por</label>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{proveedorToEdit?.creator_name || '--'} <span className="text-slate-400 font-medium ml-2">{proveedorToEdit?.created_at ? format(new Date(proveedorToEdit.created_at), 'dd/MM/yyyy HH:mm') : ''}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última modificación</label>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{proveedorToEdit?.updater_name || 'Sin cambios registrados'} <span className="text-slate-400 font-medium ml-2">{proveedorToEdit?.updated_at ? format(new Date(proveedorToEdit.updated_at), 'dd/MM/yyyy HH:mm') : ''}</span></p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={cn("text-xs font-black uppercase tracking-widest", activo ? "text-blue-600" : "text-slate-400")}>{activo ? 'Activo' : 'Inactivo'}</span>
            <button
              type="button"
              onClick={() => setActivo(!activo)}
              className={cn(
                "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                activo ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  activo ? "translate-x-7" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
