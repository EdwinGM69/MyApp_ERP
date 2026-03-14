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

const initialFormData = {
  nombre: '',
  descripcion: '',
  tipo: 'Descuento %',
  activo: true,
  fecha_inicio: '',
  fecha_fin: '',
}

export default function PromocionesPage() {
  const [data, setData] = useState<Promocion[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState(initialFormData)
  const [detallesLineas, setDetallesLineas] = useState<Partial<PromocionDetalle>[]>([])
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [currentCodigoPromocion, setCurrentCodigoPromocion] = useState('')
  const [auditData, setAuditData] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      // Adding details inclusion implicitly in the server, or we can fetch them individually on edit.
      const res = await apiFetch(`/api/precios/promociones?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (error) {
      toast.error('Error al cargar promociones')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

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
    fetchData() 
    fetchMateriales()
  }, [fetchData, fetchMateriales])

  function formatDateRange(inicio: string, fin?: string | null) {
    const format = (dateStr: string) => {
      const d = new Date(dateStr)
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
    }
    const start = format(inicio)
    const end = fin ? format(fin) : 'Indefinido'
    return `${start} - ${end}`
  }

  const handleOpenModal = (mode: 'create' | 'edit', promo?: Promocion) => {
    setModalMode(mode)
    if (mode === 'edit' && promo) {
      setCurrentId(promo.id)
      setCurrentCodigoPromocion(promo.codigo_promocion)
      setFormData({
        nombre: promo.nombre,
        descripcion: promo.descripcion || '',
        tipo: promo.tipo,
        activo: promo.activo,
        fecha_inicio: promo.fecha_inicio.split('T')[0],
        fecha_fin: promo.fecha_fin ? promo.fecha_fin.split('T')[0] : '',
      })
      setDetallesLineas(promo.detalles || [])
      setAuditData({
        created_at: promo.created_at,
        updated_at: promo.updated_at,
        creador: promo.creador,
        actualizador: promo.actualizador
      })
    } else {
      setFormData(initialFormData)
      setDetallesLineas([])
      setCurrentCodigoPromocion(`PROM-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`)
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
        codigo_promocion: currentCodigoPromocion,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        tipo: formData.tipo,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin || null,
        activo: formData.activo,
        detalles: detallesLineas.filter(d => Boolean(d.material_id)).map(d => ({
          material_id: Number(d.material_id),
          tipo_promocion: d.tipo_promocion || null,
          tipo_descuento: d.tipo_descuento || null,
          valor: d.valor !== null && d.valor !== undefined && String(d.valor) !== '' ? Number(d.valor) : null
        }))
      }

      const url = '/api/precios/promociones'
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      const body = modalMode === 'create' ? payload : { id: currentId, ...payload }

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar la promoción')
      }

      toast.success(modalMode === 'create' ? 'Promoción creada correctamente' : 'Promoción actualizada correctamente')
      handleCloseModal()
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error')
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

  const columns = [
    { 
      key: 'codigo_promocion', 
      header: 'ID PROMO',
      render: (r: Promocion) => <span className="text-slate-500 font-mono text-sm tracking-tight">{r.codigo_promocion}</span>
    },
    {
      key: 'nombre', 
      header: 'NOMBRE',
      render: (r: Promocion) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-200">{r.nombre}</span>
          {r.descripcion && (
            <span className="text-xs text-slate-500">{r.descripcion}</span>
          )}
        </div>
      )
    },
    {
      key: 'tipo', 
      header: 'TIPO',
      render: (r: Promocion) => {
        let bgClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
        
        switch (r.tipo) {
          case '2x1': 
            bgClass = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
            break
          case 'Combo':
            bgClass = 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400'
            break
          case 'Envío Gratis':
            bgClass = 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
            break
          case 'Descuento %':
            bgClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
            break
          case '3x2':
            bgClass = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400'
            break
        }

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${bgClass}`}>
            {r.tipo}
          </span>
        )
      }
    },
    {
      key: 'vigencia', 
      header: 'VIGENCIA',
      render: (r: Promocion) => <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>,
    },
    {
      key: 'estado', 
      header: 'ESTADO',
      render: (r: Promocion) => {
        const now = new Date()
        const inicio = new Date(r.fecha_inicio)
        const fin = r.fecha_fin ? new Date(r.fecha_fin) : null

        let state = 'Activa'
        let colorClass = 'text-emerald-700 dark:text-emerald-400'
        let dotClass = 'bg-emerald-500'

        if (!r.activo || (fin && now > fin)) {
          state = 'Inactiva'
          colorClass = 'text-slate-500 dark:text-slate-400'
          dotClass = 'bg-slate-400'
        } else if (now < inicio) {
          state = 'Programada'
          colorClass = 'text-amber-600 dark:text-amber-400'
          dotClass = 'bg-amber-500'
        }

        return (
          <div className={`inline-flex items-center gap-2 font-bold text-sm ${colorClass}`}>
            <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            {state}
          </div>
        )
      },
    },
    {
      key: 'acciones', 
      header: 'ACCIONES',
      render: (r: Promocion) => (
        <div className="flex justify-end pr-4">
          <button 
            onClick={() => handleOpenModal('edit', r)}
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Topbar title="Precios / Promociones" />

      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Promociones
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Configura y monitorea las ofertas activas en tu sistema POS.
            </p>
          </div>
          <button 
            onClick={() => handleOpenModal('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0 text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Agregar Nueva Promoción
          </button>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron promociones." />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-2 border-t border-slate-100 dark:border-slate-800">
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
        title="Registro de Datos de Promoción"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-16rem)] sm:h-auto">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <p className="text-sm text-slate-500 mb-2 px-1">Gestione los detalles, vigencia y líneas de productos para nuevas campañas.</p>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Información de la Promoción */}
              <div className="lg:w-2/3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-blue-600 text-xl font-light">info</span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-[15px]">Información de la Promoción</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">ID PROMOCIÓN</label>
                    <input
                      type="text"
                      value={currentCodigoPromocion}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 font-medium text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">ESTADO</label>
                    <select
                      value={formData.activo ? 'Activo' : 'Inactivo'}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'Activo' })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Additional logic to satisfy constraints unseen in image but needed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">NOMBRE (INTERNO)</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Aniversario 2024"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">CLASIFICACIÓN GENERAL</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="Descuento %">Descuento %</option>
                      <option value="2x1">2x1</option>
                      <option value="3x2">3x2</option>
                      <option value="Combo">Combo</option>
                      <option value="Envío Gratis">Envío Gratis</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider">DESCRIPCIÓN</label>
                  <textarea
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalle los objetivos y alcance de la promoción..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Vigencia */}
              <div className="lg:w-1/3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-blue-600 text-xl font-light">calendar_today</span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-[15px]">Vigencia</h4>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">FECHA INICIO</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wider">FECHA FINAL</label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Líneas de Promoción */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl font-light">list_alt</span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-[15px]">Líneas de Promoción</h4>
                </div>
                <button
                  type="button"
                  onClick={addLinea}
                  className="text-blue-600 hover:text-blue-800 text-[13px] font-bold flex items-center gap-1 transition-colors uppercase tracking-wide"
                >
                  <span className="material-symbols-outlined text-lg">add</span> AÑADIR LÍNEA
                </button>
              </div>

              {detallesLineas.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[80px]">ID LÍNEA</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest min-w-[150px]">CÓDIGO PRODUCTO</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[120px]">PRECIO VENTA</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[160px]">TIPO PROMOCIÓN</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[160px]">TIPO DESCUENTO</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[100px]">VALOR</th>
                        <th className="pb-3 pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center w-[60px]">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {detallesLineas.map((linea, idx) => {
                        const mat = materiales.find(m => m.id === Number(linea.material_id)) || linea.material
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 pr-4 text-slate-500 text-[13px]">{(idx + 1).toString().padStart(3, '0')}</td>
                            <td className="py-2.5 pr-4">
                              <select
                                value={linea.material_id || ''}
                                onChange={(e) => updateLinea(idx, 'material_id', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none"
                              >
                                <option value="">Seleccione...</option>
                                {materiales.map(m => (
                                  <option key={m.id} value={m.id}>{m.codigo}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 pr-4">
                              <input
                                type="text"
                                disabled
                                value={mat ? Number(mat.precio_venta).toFixed(2) : ''}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-500 outline-none"
                              />
                            </td>
                            <td className="py-2.5 pr-4">
                              <select
                                value={linea.tipo_promocion || 'Descuento'}
                                onChange={(e) => updateLinea(idx, 'tipo_promocion', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none"
                              >
                                <option value="Descuento">Descuento</option>
                                <option value="Paga">Paga</option>
                                <option value="Regalo">Regalo</option>
                              </select>
                            </td>
                            <td className="py-2.5 pr-4">
                              <select
                                value={linea.tipo_descuento || 'Porcentaje'}
                                onChange={(e) => updateLinea(idx, 'tipo_descuento', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none"
                              >
                                <option value="Porcentaje">Porcentaje</option>
                                <option value="Monto Fijo">Monto Fijo</option>
                              </select>
                            </td>
                            <td className="py-2.5 pr-4">
                              <input
                                type="number"
                                step="any"
                                value={linea.valor !== null && linea.valor !== undefined ? linea.valor : ''}
                                onChange={(e) => updateLinea(idx, 'valor', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm outline-none"
                              />
                            </td>
                            <td className="py-2.5 pl-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLinea(idx)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
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
                <div className="text-center py-6 text-slate-400 text-[13px] bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                  Ninguna línea asignada. Utilice "+ AÑADIR LÍNEA".
                </div>
              )}
            </div>

            {/* Auditoría Section */}
            {modalMode === 'edit' && auditData && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-400 text-xl font-light">history</span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-[15px]">Auditoría</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FECHA CREACIÓN</p>
                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded">
                      {auditData.created_at ? new Date(auditData.created_at).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">USUARIO CREACIÓN</p>
                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded">
                      {auditData.creador?.nombre || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FECHA MODIFICACIÓN</p>
                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded">
                      {auditData.updated_at ? new Date(auditData.updated_at).toLocaleString() : '--/--/---- --:--'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">USUARIO MODIFICACIÓN</p>
                    <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 py-1.5 px-3 bg-slate-50 dark:bg-slate-900 rounded">
                      {auditData.actualizador?.nombre || '--'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex justify-end gap-3 shrink-0 rounded-b-xl">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-5 py-2.5 rounded text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              Guardar Promoción
            </button>
          </div>
        </form>
      </CrudModal>

    </div>
  )
}
