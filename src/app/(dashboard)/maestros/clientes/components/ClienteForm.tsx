'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Cliente {
  id: number
  codigo: string
  tipo: string
  nombre: string
  nombres_completos?: string | null
  apellidos_completos?: string | null
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  contacto?: string
  activo: boolean
  created_at: string
  updated_at: string
  created_by?: number
  updated_by?: number
  creator_name?: string
  updater_name?: string
}

interface Venta {
  id: number
  numero_pedido: string
  fecha_venta: string
  total: number
  estado: string
}

interface ClienteFormProps {
  clienteToEdit?: Cliente | null
}

export default function ClienteForm({ clienteToEdit }: ClienteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [tipo, setTipo] = useState('natural')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [nombresCompletos, setNombresCompletos] = useState('')
  const [apellidosCompletos, setApellidosCompletos] = useState('')
  const [tipoNif, setTipoNif] = useState('DNI / NIE')
  const [nif, setNif] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [activo, setActivo] = useState(true)

  // History state
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loadingVentas, setLoadingVentas] = useState(false)

  // Initialize form
  useEffect(() => {
    if (clienteToEdit) {
      setTipo(clienteToEdit.tipo)
      setCodigo(clienteToEdit.codigo)
      setActivo(clienteToEdit.activo)
      setEmail(clienteToEdit.email || '')
      setTelefono(clienteToEdit.telefono || '')
      setNif(clienteToEdit.nif || '')

      if (clienteToEdit.tipo === 'natural') {
        setNombresCompletos(clienteToEdit.nombres_completos || '')
        setApellidosCompletos(clienteToEdit.apellidos_completos || '')
      } else {
        setNombre(clienteToEdit.nombre || '')
      }

      fetchVentas(clienteToEdit.id)
    } else {
      // Auto-generate code? ClientesPage uses empty string
      setCodigo('CLI-' + Math.floor(1000 + Math.random() * 9000))
    }
  }, [clienteToEdit])

  const fetchVentas = async (id: number) => {
    setLoadingVentas(true)
    try {
      const res = await apiFetch(`/api/ventas?clienteId=${id}&pageSize=5`)
      const json = await res.json()
      setVentas(json.data || [])
    } catch (error) {
      console.error('Error fetching ventas:', error)
    } finally {
      setLoadingVentas(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const finalNombre = tipo === 'natural' 
      ? `${nombresCompletos.trimEnd()} ${apellidosCompletos.trimEnd()}`.trim() 
      : nombre.trim()

    const payload = {
      id: clienteToEdit?.id,
      codigo,
      tipo,
      nombre: finalNombre,
      nombres_completos: tipo === 'natural' ? nombresCompletos.trimEnd() : null,
      apellidos_completos: tipo === 'natural' ? apellidosCompletos.trimEnd() : null,
      email,
      telefono,
      nif,
      activo
    }

    try {
      const res = await apiFetch('/api/clientes', {
        method: clienteToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(clienteToEdit ? 'Cliente actualizado' : 'Cliente creado')
      router.push('/maestros/clientes')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const columnsVentas = [
    { key: 'fecha_venta', header: 'FECHA', render: (v: Venta) => format(new Date(v.fecha_venta), 'dd/MM/yyyy', { locale: es }) },
    { key: 'numero_pedido', header: 'FACTURA #', render: (v: Venta) => <span className="text-blue-600 font-medium">{v.numero_pedido}</span> },
    { key: 'total', header: 'MONTO TOTAL', render: (v: Venta) => <span className="font-bold">${Number(v.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span> },
    {
      key: 'estado', header: 'ESTADO',
      render: (v: Venta) => (
        <Badge variant={v.estado === 'procesada' ? 'success' : v.estado === 'anulada' ? 'error' : 'neutral'}>
          {v.estado === 'procesada' ? 'Completada' : v.estado === 'anulada' ? 'Anulada' : 'Pendiente'}
        </Badge>
      )
    },
    {
      key: 'actions', header: 'ACCIONES',
      render: () => (
        <button type="button" className="p-1 rounded hover:bg-slate-100 text-slate-400">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
        </button>
      )
    }
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Premium Sticky Header */}
      <div className="sticky top-[-32px] z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4 mb-8 -mt-8 -mx-8 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/maestros/clientes')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
              <span>Maestros</span>
              <span className="text-[8px]">/</span>
              <span>Catálogo de Clientes</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {clienteToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            form="cliente-form"
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

      <form id="cliente-form" onSubmit={handleSubmit} className="max-w-[1200px] mx-auto w-full space-y-6 pb-20">

        {/* Identity Information */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">person</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Información de Identidad</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de cliente</label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none [background-image:none] pr-10"
                >
                  <option value="natural">Persona Natural</option>
                  <option value="empresa">Empresa</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código</label>
              <input
                type="text" required value={codigo} onChange={e => setCodigo(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="CLI-0001"
              />
            </div>
            {tipo === 'empresa' ? (
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                <input
                  type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Nombre de la empresa"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombres Completos</label>
                  <input
                    type="text" required value={nombresCompletos} onChange={e => setNombresCompletos(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Juan Alberto"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Apellidos Completos</label>
                  <input
                    type="text" required value={apellidosCompletos} onChange={e => setApellidosCompletos(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="Pérez Rodriguez"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Documents and Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">contact_page</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Documentos y Contacto</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo NIF</label>
              <div className="relative">
                <select
                  value={tipoNif} onChange={e => setTipoNif(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none [background-image:none] pr-10"
                >
                  <option>DNI / NIE</option>
                  <option>RUC</option>
                  <option>Pasaporte</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Número NIF</label>
              <input
                type="text" value={nif} onChange={e => setNif(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="00000000X"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
              <input
                type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="+34 600 000 000"
              />
            </div>
          </div>
        </div>

        {/* 3. Estado y Auditoría */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Estado y Auditoría</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
              <div className="relative">
                <select
                  value={activo ? 'true' : 'false'} onChange={e => setActivo(e.target.value === 'true')}
                  className="w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none [background-image:none] pr-10"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fecha creación</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-500 h-[50px] flex items-center">
                {clienteToEdit ? format(new Date(clienteToEdit.created_at), 'dd/MM/yyyy HH:mm') : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Usuario creación</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-500 h-[50px] flex items-center">
                {clienteToEdit?.creator_name || '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fecha modificación</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-500 h-[50px] flex items-center">
                {clienteToEdit ? format(new Date(clienteToEdit.updated_at), 'dd/MM/yyyy HH:mm') : '--'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Usuario modificación</label>
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-500 h-[50px] flex items-center">
                {clienteToEdit?.updater_name || '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">shopping_basket</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Historial de Compras</h3>
            </div>
            <button type="button" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Exportar a PDF
            </button>
          </div>
          <div className="p-0">
            <DataTable
              columns={columnsVentas}
              data={ventas}
              loading={loadingVentas}
              emptyMessage="No se registran compras para este cliente"
            />
            {ventas.length > 0 && (
              <div className="p-4 text-center border-t border-slate-50 dark:border-slate-800">
                <button type="button" className="text-blue-600 text-[11px] font-bold hover:underline uppercase tracking-widest">
                  Ver todo el historial
                </button>
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  )
}
