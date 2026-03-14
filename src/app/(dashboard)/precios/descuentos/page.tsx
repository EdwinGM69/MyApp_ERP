'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import CrudModal from '@/components/ui/CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface Descuento {
  id: number
  codigo: string
  nombre: string
  tipo: string
  valor: number
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
  material_id?: number | null
  created_at?: string
  updated_at?: string
  created_by?: number
  updated_by?: number
}

interface Material {
  id: number
  codigo: string
  descripcion: string
  categoria?: { nombre: string }
}

export default function DescuentosPage() {
  const [data, setData] = useState<Descuento[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)

  const [materiales, setMateriales] = useState<Material[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create'|'edit'>('create')
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'PORCENTAJE',
    material_id: '',
    valor: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
  })

  // Para mostrar fecha y usuario en edición (solo lectura visual en el modal)
  const [auditData, setAuditData] = useState({
    created_at: '',
    updated_at: '',
    created_by: '',
    updated_by: ''
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const res = await apiFetch(`/api/precios/descuentos?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar descuentos')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  const fetchMateriales = useCallback(async () => {
    try {
      // Cargamos una buena cantidad de materiales o todos para el select
      const res = await apiFetch('/api/materiales?pageSize=1000') 
      const json = await res.json()
      setMateriales(json.data ?? [])
    } catch (error) {
      console.error('Error al cargar materiales', error)
    }
  }, [])

  useEffect(() => { 
    fetchData() 
    fetchMateriales()
  }, [fetchData, fetchMateriales])

  function formatDateRange(inicio: string, fin?: string) {
    const format = (dateStr: string) => {
      const d = new Date(dateStr)
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
    }
    const start = format(inicio)
    const end = fin ? format(fin) : 'Indefinido'
    return `${start} - ${end}`
  }

  function formatValor(tipo: string, valor: number) {
    if (tipo === 'PORCENTAJE') return `${Number(valor)}%`
    return `$${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const columns = [
    { 
      key: 'codigo', 
      header: 'ID DESCUENTO',
      render: (r: Descuento) => <span className="text-blue-600 font-medium">{r.codigo}</span>
    },
    {
      key: 'nombre', 
      header: 'NOMBRE DEL DESCUENTO',
      render: (r: Descuento) => <span className="font-bold text-slate-900 dark:text-white">{r.nombre}</span>
    },
    {
      key: 'tipo', 
      header: 'TIPO',
      render: (r: Descuento) => (
        <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {r.tipo}
        </span>
      )
    },
    {
      key: 'valor', 
      header: 'VALOR',
      render: (r: Descuento) => <span className="font-bold">{formatValor(r.tipo, r.valor)}</span>,
    },
    {
      key: 'vigencia', 
      header: 'VIGENCIA',
      render: (r: Descuento) => <span className="text-slate-500 font-medium tracking-tight text-sm">{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>,
    },
    {
      key: 'activo', 
      header: 'ESTADO',
      render: (r: Descuento) => {
        const isActive = r.activo
        return (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isActive ? 'Activo' : 'Inactivo'}
          </div>
        )
      },
    },
    {
      key: 'actions', 
      header: 'ACCIONES',
      render: (r: Descuento) => (
        <button 
          onClick={() => handleOpenModal('edit', r)}
          className="text-blue-600 dark:text-blue-500 font-bold text-sm hover:underline"
        >
          Editar
        </button>
      ),
    },
  ]

  const formatAuditDate = (dateString?: string) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute:'2-digit' })}`
  }

  const handleOpenModal = (mode: 'create'|'edit', descuento?: Descuento) => {
    setModalMode(mode)
    if (mode === 'edit' && descuento) {
      setCurrentId(descuento.id)
      setFormData({
        codigo: descuento.codigo,
        nombre: descuento.nombre,
        tipo: descuento.tipo,
        material_id: descuento.material_id ? String(descuento.material_id) : '',
        valor: String(descuento.valor),
        fecha_inicio: descuento.fecha_inicio.split('T')[0],
        fecha_fin: descuento.fecha_fin ? descuento.fecha_fin.split('T')[0] : '',
        activo: descuento.activo,
      })
      setAuditData({
        created_at: formatAuditDate(descuento.created_at),
        updated_at: formatAuditDate(descuento.updated_at),
        created_by: descuento.created_by ? String(descuento.created_by) : '-',
        updated_by: descuento.updated_by ? String(descuento.updated_by) : '-'
      })
    } else {
      setCurrentId(null)
      const dateStr = new Date().toISOString().split('T')[0]
      setFormData({
        codigo: '',
        nombre: '',
        tipo: 'PORCENTAJE',
        material_id: '',
        valor: '',
        fecha_inicio: dateStr,
        fecha_fin: '',
        activo: true,
      })
      setAuditData({ created_at: '-', updated_at: '-', created_by: '-', updated_by: '-' })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        material_id: formData.material_id ? Number(formData.material_id) : null,
        valor: Number(formData.valor),
        fecha_fin: formData.fecha_fin || null,
        ...(modalMode === 'edit' && { id: currentId!! })
      }

      const method = modalMode === 'edit' ? 'PUT' : 'POST'
      const res = await apiFetch('/api/precios/descuentos', {
        method,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al guardar')
      }

      toast.success(`Descuento ${modalMode === 'edit' ? 'actualizado' : 'creado'} exitosamente`)
      fetchData()
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar descuento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMaterial = materiales.find(m => String(m.id) === formData.material_id)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Topbar title="Precios" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Descuentos
            </h3>
            <p className="text-slate-500 text-base mt-2">
              Configura y administra las reglas de descuento de tu comercio.
            </p>
          </div>
          <button 
            onClick={() => handleOpenModal('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Agregar Nuevo Descuento
          </button>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron descuentos" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full">
              <Pagination 
                page={page} 
                totalPages={Math.ceil(total / pageSize)} 
                onPage={setPage}
                pageSize={pageSize} 
                onPageSize={(s) => { setPageSize(s); setPage(1) }} 
                total={total} 
              />
            </div>
          </div>
        </div>
      </div>

      <CrudModal
        open={modalOpen}
        onClose={handleCloseModal}
        title="Registro de Datos de Descuento"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-16rem)] sm:h-auto">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <p className="text-sm text-slate-500 mb-4 px-2">Configure los parámetros de descuentos comerciales para materiales y categorías.</p>
            {/* Sección Información General */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-500">info</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Información General</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">ID REGISTRO</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    placeholder="Ej. DSC-2024-001"
                    required
                    disabled={modalMode === 'edit'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">NOMBRE / DESCRIPCIÓN</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej. Black Friday"
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">TIPO DE DESCUENTO</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO FIJO">Monto Fijo ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">CÓDIGO MATERIAL</label>
                  <select
                    value={formData.material_id || ''}
                    onChange={(e) => setFormData({...formData, material_id: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Aplicar a todos (Global)</option>
                    {materiales.map(m => (
                      <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">CATEGORÍA</label>
                  <input
                    type="text"
                    value={selectedMaterial?.categoria?.nombre || 'General'}
                    disabled
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">
                    VALOR DESCUENTO {formData.tipo === 'PORCENTAJE' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    required
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">ESTADO</label>
                  <select
                    value={formData.activo ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, activo: e.target.value === 'true'})}
                    className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${formData.activo ? 'text-emerald-600' : 'text-slate-500'}`}
                  >
                    <option value="true" className="text-emerald-600 font-bold">Activo</option>
                    <option value="false" className="text-slate-500 font-bold">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección Vigencia */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-500">calendar_month</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Vigencia del Descuento</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">FECHA INICIO</label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">FECHA FINAL (Opcional)</label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Sección Auditoría */}
            {modalMode === 'edit' && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-500">history</span>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Auditoría</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">FECHA CREACIÓN</label>
                    <input type="text" value={auditData.created_at} disabled className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">USUARIO CREACIÓN</label>
                    <input type="text" value={auditData.created_by} disabled className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">FECHA MODIFICACIÓN</label>
                    <input type="text" value={auditData.updated_at} disabled className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">USUARIO MODIFICACIÓN</label>
                    <input type="text" value={auditData.updated_by} disabled className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción del Modal */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">autorenew</span>
                  GUARDANDO...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  GUARDAR DESCUENTO
                </>
              )}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  )
}
