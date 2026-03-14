'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import CrudModal from '@/components/ui/CrudModal'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

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

const initialFormData = {
  codigo: '',
  tipo: 'PORCENTAJE',
  valor: '',
  moneda: 'USD',
  isLimitado: 'Limitado',
  limite_uso: '',
  activo: true,
  fecha_inicio: '',
  fecha_fin: '',
}

export default function CuponesPage() {
  const [data, setData] = useState<Cupon[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState(initialFormData)
  const [detallesLineas, setDetallesLineas] = useState<Partial<CuponDetalle>[]>([])
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [currentCodigoCupon, setCurrentCodigoCupon] = useState('')
  const [auditData, setAuditData] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const res = await apiFetch(`/api/precios/cupones?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar cupones')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  const fetchMateriales = useCallback(async () => {
    try {
      const res = await apiFetch('/api/materiales?limit=1000') // Fetch all or search
      const json = await res.json()
      setMateriales(json.data ?? [])
    } catch (error) {
      console.error('Error al cargar materiales:', error)
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

  function formatValor(tipo: string, valor: number, moneda: string) {
    if (tipo === 'PORCENTAJE') return `${Number(valor)}%`
    return `${moneda === 'PEN' ? 'S/' : '$'}${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
  }

  const handleOpenModal = (mode: 'create' | 'edit', cupon?: Cupon) => {
    setModalMode(mode)
    if (mode === 'edit' && cupon) {
      setCurrentId(cupon.id)
      setCurrentCodigoCupon(cupon.codigo_cupon)
      setFormData({
        codigo: cupon.codigo,
        tipo: cupon.tipo,
        valor: cupon.valor.toString(),
        moneda: cupon.moneda || 'USD',
        isLimitado: cupon.limite_uso !== null ? 'Limitado' : 'Ilimitado',
        limite_uso: cupon.limite_uso !== null ? cupon.limite_uso!.toString() : '',
        activo: cupon.activo,
        fecha_inicio: cupon.fecha_inicio.split('T')[0],
        fecha_fin: cupon.fecha_fin ? cupon.fecha_fin.split('T')[0] : '',
      })
      setDetallesLineas(cupon.detalles || [])
      setAuditData({
        created_at: cupon.created_at,
        updated_at: cupon.updated_at,
        creador: cupon.creador,
        actualizador: cupon.actualizador
      })
    } else {
      setFormData({ ...initialFormData, codigo: `PROMO-${Math.floor(Math.random() * 10000)}` })
      setDetallesLineas([])
      setCurrentCodigoCupon(`CPN-${new Date().getFullYear()}-00${Math.floor(Math.random() * 100)}`) // Mock ID Generation
      setCurrentId(null)
      setAuditData(null)
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        codigo_cupon: currentCodigoCupon,
        codigo: formData.codigo,
        tipo: formData.tipo,
        valor: Number(formData.valor),
        moneda: formData.moneda,
        limite_uso: formData.isLimitado === 'Limitado' ? Number(formData.limite_uso) : null,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin || null,
        activo: formData.activo,
        detalles: detallesLineas.filter(d => d.material_id).map(d => ({ material_id: Number(d.material_id) }))
      }

      const url = '/api/precios/cupones'
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      const body = modalMode === 'create' ? payload : { id: currentId, ...payload }

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar el cupón')
      }

      toast.success(modalMode === 'create' ? 'Cupón creado correctamente' : 'Cupón actualizado correctamente')
      handleCloseModal()
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error')
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

  const columns = [
    { 
      key: 'codigo_cupon', 
      header: 'ID CUPÓN',
      render: (r: Cupon) => <span className="font-bold text-slate-700 dark:text-slate-300">{r.codigo_cupon}</span>
    },
    {
      key: 'codigo', 
      header: 'CÓDIGO',
      render: (r: Cupon) => (
        <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
          {r.codigo}
        </span>
      )
    },
    {
      key: 'tipo', 
      header: 'TIPO',
      render: (r: Cupon) => <span className="text-slate-500 font-medium tracking-wide uppercase text-xs">{r.tipo}</span>
    },
    {
      key: 'valor', 
      header: 'VALOR',
      render: (r: Cupon) => <span className="font-black text-slate-900 dark:text-white">{formatValor(r.tipo, r.valor, r.moneda)}</span>,
    },
    {
      key: 'limite', 
      header: 'LÍMITE DE USO',
      render: (r: Cupon) => (
        <span className="text-slate-600 dark:text-slate-400">
          {r.limite_uso === null ? 'Ilimitado' : r.limite_uso}
        </span>
      ),
    },
    {
      key: 'vigencia', 
      header: 'VIGENCIA',
      render: (r: Cupon) => <span className="text-slate-500 font-medium tracking-tight text-sm">{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>,
    },
    {
      key: 'estado', 
      header: 'ESTADO',
      render: (r: Cupon) => {
        let state = 'ACTIVO'
        let colorClass = 'text-emerald-600'
        let dotClass = 'bg-emerald-500'

        if (!r.activo) {
          state = 'INACTIVO'
          colorClass = 'text-slate-400'
          dotClass = 'bg-slate-300'
        } else if (r.fecha_fin && new Date(r.fecha_fin) < new Date()) {
          state = 'EXPIRADO'
          colorClass = 'text-red-600'
          dotClass = 'bg-red-500'
        }

        return (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold text-xs ${colorClass}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {state}
          </div>
        )
      },
    },
    {
      key: 'actions', 
      header: 'ACCIONES',
      render: (r: Cupon) => (
        <button 
          onClick={() => handleOpenModal('edit', r)}
          className="text-blue-600 dark:text-blue-500 font-bold text-sm hover:underline"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Topbar title="Precios / Cupones" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Cupones
            </h3>
            <p className="text-slate-500 text-base mt-2">
              Crea y administra los cupones de descuento para tus clientes.
            </p>
          </div>
          <button 
            onClick={() => handleOpenModal('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Agregar Nuevo Cupón
          </button>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron cupones" />
          
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
        title="Registro de Datos de Cupón"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-16rem)] sm:h-auto">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <p className="text-sm text-slate-500 mb-4 px-2">Complete la información detallada para registrar un nuevo cupón de descuento en el sistema.</p>
            
            {/* Sección Información del Cupón */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600 text-xl">local_activity</span>
                <h4 className="font-bold text-slate-800 dark:text-white">Información del Cupón</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ID Cupón</label>
                  <input
                    type="text"
                    value={currentCodigoCupon}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 text-sm font-medium"
                  />
                </div>
                
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: Descuento CyberWow 2024"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
                  />
                </div>
                
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Cupón</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO FIJO">Monto Fijo</option>
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moneda</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Límite de Uso</label>
                  <select
                    value={formData.isLimitado}
                    onChange={(e) => setFormData({ ...formData, isLimitado: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Limitado">Limitado</option>
                    <option value="Ilimitado">Ilimitado</option>
                  </select>
                </div>

                {formData.isLimitado === 'Limitado' && (
                  <div className="space-y-2 lg:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad Límite</label>
                    <input
                      type="number"
                      required
                      value={formData.limite_uso}
                      onChange={(e) => setFormData({ ...formData, limite_uso: e.target.value })}
                      placeholder="100"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                )}

                <div className="space-y-2 lg:col-span-1 flex flex-col justify-end">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} 
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${formData.activo ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.activo ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formData.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                </div>

              </div>
            </div>

            {/* Sección Vigencia */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600 text-xl">event</span>
                <h4 className="font-bold text-slate-800 dark:text-white">Vigencia</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Inicio</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Final</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Líneas de Productos */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">list_alt</span>
                  <h4 className="font-bold text-slate-800 dark:text-white">Líneas de Productos</h4>
                </div>
                <button
                  type="button"
                  onClick={addLinea}
                  className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span> Añadir Línea
                </button>
              </div>

              {detallesLineas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Código Producto</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Base</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Moneda</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detallesLineas.map((linea, idx) => {
                        const mat = materiales.find(m => m.id === Number(linea.material_id)) || linea.material
                        return (
                          <tr key={idx}>
                            <td className="py-3 pr-4">
                              <select
                                value={linea.material_id || ''}
                                onChange={(e) => updateLinea(idx, 'material_id', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              >
                                <option value="">Seleccione un material...</option>
                                {materiales.map(m => (
                                  <option key={m.id} value={m.id}>{m.codigo} - {m.descripcion}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                disabled
                                value={mat ? Number(mat.precio_venta).toFixed(2) : '0.00'}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                disabled
                                value={mat?.moneda || 'PEN'}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500"
                              >
                                <option value="PEN">PEN</option>
                                <option value="USD">USD</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              {mat ? (
                                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">Disponible</span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Pendiente</span>
                              )}
                            </td>
                            <td className="py-3 pl-4 text-center">
                              <button
                                type="button"
                                onClick={() => removeLinea(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Aún no hay productos asociados a este cupón. Presione "Añadir Línea" para comenzar.
                </div>
              )}
            </div>

            {/* Sección Auditoría */}
            {modalMode === 'edit' && auditData && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-slate-400 text-xl">history</span>
                  <h4 className="font-bold text-slate-800 dark:text-white">Auditoría</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Creación</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {auditData.created_at ? new Date(auditData.created_at).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario Creación</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {auditData.creador?.nombre || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Modificación</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {auditData.updated_at ? new Date(auditData.updated_at).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario Modificación</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {auditData.actualizador?.nombre || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              Guardar Cupón
            </button>
          </div>
        </form>
      </CrudModal>

    </div>
  )
}
