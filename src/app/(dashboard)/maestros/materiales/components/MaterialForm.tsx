'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import MarcaSelect from '@/components/ui/MarcaSelect'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import TipoSelect from '@/components/ui/TipoSelect'
import UnidadSelect from '@/components/ui/UnidadSelect'
import EsquemaSelect from '@/components/ui/EsquemaSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import MaterialSelect from '@/components/ui/MaterialSelect'
import UbicacionSelect from '@/components/ui/UbicacionSelect'
import { cn, formatCurrency } from '@/lib/utils'

interface Sustituto {
  id?: number
  sustituto_id: number
  codigo: string
  descripcion: string
}

interface Componente {
  id?: number
  componente_id: number
  codigo: string
  descripcion: string
  cantidad: number
  unidad_medida_id?: number
}

interface Presentacion {
  id?: number
  unidad_medida_id: number
  unidad_control: boolean
  activo: boolean
  // For display purposes
  unidad_medida?: { id: number, descripcion: string, abreviatura: string }
}

interface Material {
  id: number
  codigo: string
  descripcion: string
  codigo_mascara?: string
  codigo_barras?: string
  categoria_id?: number
  categoria_rel?: { id: number, descripcion: string }
  tipo_id?: number
  tipo_rel?: { id: number, descripcion: string }
  marca_id?: number
  marca?: { id: number, descripcion: string }
  nivel_rotacion?: string
  stock_minimo?: number
  stock_maximo?: number
  perecible: boolean
  compuesto: boolean
  precio_costo: number
  moneda_precio_compra?: string
  moneda_precio_compra_id?: number
  moneda_precio_compra_rel?: { id: number, descripcion: string, abreviatura: string, simbolo: string }
  costo_promedio?: number
  moneda_costo_promedio?: string
  moneda_costo_promedio_id?: number
  moneda_costo_promedio_rel?: { id: number, descripcion: string, abreviatura: string, simbolo: string }
  proveedor_id?: number
  unidad_medida_id?: number
  esquema_id?: number
  ubicacion_default_id?: number
  imagen_url?: string
  activo: boolean
  created_at?: string
  created_by?: number
  updated_at?: string
  updated_by?: number
  creator_name?: string
  updater_name?: string
  sustitutos?: { sustituto: { id: number, codigo: string, descripcion: string } }[]
  presentaciones?: Presentacion[]
  componentes?: { cantidad: number, unidad_medida_id: number, componente: { id: number, codigo: string, descripcion: string } }[]
}

interface MaterialFormProps {
  materialToEdit?: Material
}

export default function MaterialForm({ materialToEdit }: MaterialFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('datos')
  const [saving, setSaving] = useState(false)

  // Form State
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [codigoMascara, setCodigoMascara] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined)
  const [tipoId, setTipoId] = useState<number | undefined>(undefined)
  const [marcaId, setMarcaId] = useState<number | undefined>(undefined)
  const [perecible, setPerecible] = useState(false)
  const [compuesto, setCompuesto] = useState(false)
  const [unidadMedidaId, setUnidadMedidaId] = useState<number | undefined>(undefined)
  const [esquemaId, setEsquemaId] = useState<number | undefined>(undefined)
  const [ubicacionDefaultId, setUbicacionDefaultId] = useState<number | undefined>(undefined)

  const [nivelRotacion, setNivelRotacion] = useState('Media')
  const [stockMinimo, setStockMinimo] = useState(0)
  const [stockMaximo, setStockMaximo] = useState(0)
  const [stockLote, setStockLote] = useState(false)

  const { monedaDefault, monedaId, monedaSimbolo } = useAuthStore(state => ({
    monedaDefault: state.user?.monedaDefault || 'USD',
    monedaId: state.user?.monedaId,
    monedaSimbolo: state.user?.monedaSimbolo || '$'
  }))

  const [precioCompra, setPrecioCompra] = useState(0)
  const [monedaPrecioCompraId, setMonedaPrecioCompraId] = useState<number | undefined>(monedaId)
  const [monedaPrecioCompra, setMonedaPrecioCompra] = useState(monedaDefault)
  const [simboloPrecioCompra, setSimboloPrecioCompra] = useState(monedaSimbolo)
  const [costoPromedio, setCostoPromedio] = useState(0)
  const [monedaCostoPromedioId, setMonedaCostoPromedioId] = useState<number | undefined>(monedaId)
  const [monedaCostoPromedio, setMonedaCostoPromedio] = useState(monedaDefault)
  const [simboloCostoPromedio, setSimboloCostoPromedio] = useState(monedaSimbolo)
  const [proveedorId, setProveedorId] = useState<number | ''>('')
  const [activo, setActivo] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!imagenUrl) setLocalPreview(null)
  }, [imagenUrl])

  // Lists
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([])
  const [sustitutos, setSustitutos] = useState<Sustituto[]>([])
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [proveedores, setProveedores] = useState<{ id: number, nombre: string }[]>([])
  const [allMateriales, setAllMateriales] = useState<{ id: number, codigo: string, descripcion: string }[]>([])
  const [unidades, setUnidades] = useState<{ id: number, descripcion: string, abreviatura: string }[]>([])

  useEffect(() => {
    async function fetchData() {
      const [provRes, matRes, uniRes] = await Promise.all([
        apiFetch('/api/proveedores?pageSize=100'),
        apiFetch('/api/materiales?pageSize=1000'),
        apiFetch('/api/logistica/unidades?pageSize=100')
      ])
      const provJson = await provRes.json()
      const matJson = await matRes.json()
      const uniJson = await uniRes.json()
      setProveedores(provJson.data || [])
      setAllMateriales(matJson.data || [])
      setUnidades(uniJson.data || [])
    }
    fetchData()

    if (materialToEdit) {
      setCodigo(materialToEdit.codigo)
      setDescripcion(materialToEdit.descripcion)
      setCodigoMascara(materialToEdit.codigo_mascara || '')
      setCodigoBarras(materialToEdit.codigo_barras || '')
      setImagenUrl(materialToEdit.imagen_url || '')
      setCategoriaId(materialToEdit.categoria_id)
      setTipoId(materialToEdit.tipo_id)
      setMarcaId(materialToEdit.marca_id)
      setPerecible(materialToEdit.perecible)
      setCompuesto(materialToEdit.compuesto)
      setUnidadMedidaId(materialToEdit.unidad_medida_id)
      setEsquemaId(materialToEdit.esquema_id)
      setUbicacionDefaultId(materialToEdit.ubicacion_default_id)
      setNivelRotacion(materialToEdit.nivel_rotacion || 'Media')
      setStockMinimo(Number(materialToEdit.stock_minimo) || 0)
      setStockMaximo(Number(materialToEdit.stock_maximo) || 0)
      // @ts-ignore - stock_lote may not be in the type yet
      setStockLote(materialToEdit.stock_lote || false)
      setPrecioCompra(Number(materialToEdit.precio_costo) || 0)
      setMonedaPrecioCompraId(materialToEdit.moneda_precio_compra_id)
      setMonedaPrecioCompra(materialToEdit.moneda_precio_compra || 'USD')
      setSimboloPrecioCompra(materialToEdit.moneda_precio_compra_rel?.simbolo || '$')
      setCostoPromedio(Number(materialToEdit.costo_promedio) || 0)
      setMonedaCostoPromedioId(materialToEdit.moneda_costo_promedio_id)
      setMonedaCostoPromedio(materialToEdit.moneda_costo_promedio || 'USD')
      setSimboloCostoPromedio(materialToEdit.moneda_costo_promedio_rel?.simbolo || '$')
      setProveedorId(materialToEdit.proveedor_id || '')
      setActivo(materialToEdit.activo)

      setPresentaciones(materialToEdit.presentaciones?.map(p => ({
        id: p.id,
        unidad_medida_id: p.unidad_medida_id,
        unidad_control: p.unidad_control,
        activo: p.activo,
        unidad_medida: p.unidad_medida
      })) || [])
      if (materialToEdit.sustitutos) {
        setSustitutos(materialToEdit.sustitutos.map(s => ({
          sustituto_id: s.sustituto.id,
          codigo: s.sustituto.codigo,
          descripcion: s.sustituto.descripcion
        })))
      }
      if (materialToEdit.componentes) {
        setComponentes(materialToEdit.componentes.map(c => ({
          componente_id: c.componente.id,
          codigo: c.componente.codigo,
          descripcion: c.componente.descripcion,
          cantidad: Number(c.cantidad),
          unidad_medida_id: c.unidad_medida_id
        })))
      }
    }
  }, [materialToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (saving) return // Guard against multiple submits

    let finalPresentaciones = [...presentaciones]
    if (unidadMedidaId) {
      // Ensure the main unidad_medida_id has a presentation with unidad_control = true
      const mainUnitExists = finalPresentaciones.some(p => p.unidad_medida_id === unidadMedidaId)
      if (!mainUnitExists) {
        finalPresentaciones.push({
          unidad_medida_id: unidadMedidaId,
          unidad_control: true,
          activo: true
        })
      }
    }

    // Set unidad_control based on whether this is the main unidad_medida_id
    finalPresentaciones = finalPresentaciones.map(p => ({
      ...p,
      unidad_control: p.unidad_medida_id === unidadMedidaId
    }))

    const payload = {
      id: materialToEdit?.id,
      codigo,
      descripcion,
      codigo_mascara: codigoMascara,
      codigo_barras: codigoBarras,
      imagen_url: imagenUrl,
      tipo_id: tipoId,
      categoria_id: categoriaId,
      marca_id: marcaId,
      unidad_medida_id: unidadMedidaId,
      esquema_id: esquemaId,
      ubicacion_default_id: ubicacionDefaultId,
      nivel_rotacion: nivelRotacion,
      stock_minimo: stockMinimo,
      stock_maximo: stockMaximo,
      perecible,
      compuesto,
      stock_lote: stockLote,
      precio_costo: precioCompra,
      moneda_precio_compra: monedaPrecioCompra,
      moneda_precio_compra_id: monedaPrecioCompraId,
      precio_venta: precioCompra * 1.2,
      costo_promedio: costoPromedio,
      moneda_costo_promedio: monedaCostoPromedio,
      moneda_costo_promedio_id: monedaCostoPromedioId,
      proveedor_id: proveedorId === '' ? null : proveedorId,
      activo,
      presentaciones: finalPresentaciones.map(p => ({ id: p.id, unidad_medida_id: p.unidad_medida_id, unidad_control: p.unidad_control, activo: p.activo })),
      sustitutos: sustitutos.map(s => ({ sustituto_id: s.sustituto_id })),
      componentes: componentes.map(c => ({ componente_id: c.componente_id, cantidad: c.cantidad, unidad_medida_id: c.unidad_medida_id }))
    }

    try {
      const res = await apiFetch('/api/materiales', {
        method: materialToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }

      toast.success(materialToEdit ? 'Material actualizado' : 'Material creado')
      router.push('/maestros/materiales')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'datos', label: 'Datos Generales' },
    { id: 'presentaciones', label: 'Presentaciones' },
    { id: 'sustitutos', label: 'Sustitutos' },
    { id: 'componentes', label: 'Componentes' },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
      {/* Premium Sticky Header (Title + Tabs) */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all">
        {/* Title area */}
        <div className="pt-2 pb-3 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/maestros/materiales')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                <span>Maestros</span>
                <span className="text-[8px]">/</span>
                <span>Catálogo de Materiales</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {materialToEdit ? 'Editar Material' : 'Nuevo Material'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              form="material-form"
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

        {/* Tabs navigation (Inside Sticky) */}
        <div className="px-8 flex gap-8 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full px-8 pt-2 pb-20">

        <form id="material-form" onSubmit={handleSubmit}>
          {activeTab === 'datos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 max-w-[1600px] mx-auto w-full">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* 1. INFORMACIÓN BÁSICA */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-blue-600">info</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Información Básica</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código</label>
                      <input
                        type="text" required value={codigo} onChange={e => setCodigo(e.target.value)}
                        disabled={!!materialToEdit}
                        className={cn(
                          "w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all font-mono",
                          materialToEdit
                            ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                            : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        )}
                        placeholder="MAT-0001"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Máscara</label>
                      <input
                        type="text" value={codigoMascara} onChange={e => setCodigoMascara(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                        placeholder="###-AAAA"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                    <input
                      type="text" required value={descripcion} onChange={e => setDescripcion(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Descripción detallada del material"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Código de Barras</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">qr_code_scanner</span>
                      <input
                        type="text" value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="7701234567890"
                      />
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">URL de Imagen</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">image</span>
                        <input
                          type="text" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)}
                          className="w-full pl-12 pr-12 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          title="Explorar archivos"
                        >
                          <span className="material-symbols-outlined text-[20px]">folder_open</span>
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setLocalPreview(event.target?.result as string);
                                // Better web-compatible path for persistence
                                setImagenUrl(`/uploads/${file.name}`);
                              };
                              reader.readAsDataURL(file);
                              toast.success('Imagen cargada. Para que se vea siempre, asegúrate de poner el archivo en la carpeta "public/uploads" de tu proyecto.');
                            }
                            // Reset input value to allow re-selection of the same file
                            e.target.value = '';
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">Proporcione una URL web o use el explorador para rutas locales (`/uploads/`).</p>
                    </div>
                    <div className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/30 dark:bg-slate-900/30 overflow-hidden shrink-0">
                      {localPreview || imagenUrl ? (
                        <img src={localPreview || imagenUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2 font-variation-icon">image</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Vista Previa</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. CONTROL DE INVENTARIO */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Control de Inventario</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unidad Medida de Control</label>
                      <UnidadSelect
                        value={unidadMedidaId}
                        onChange={setUnidadMedidaId}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 h-11">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">Control por Lote</label>
                        <p className="text-[9px] text-slate-400">Exige N° lote en los movimientos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stockLote}
                          onChange={(e) => setStockLote(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Esquema Valoración</label>
                      <EsquemaSelect
                        value={esquemaId}
                        onChange={setEsquemaId}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ubicación por Defecto</label>
                      <UbicacionSelect
                        value={ubicacionDefaultId}
                        onChange={setUbicacionDefaultId}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nivel Rotación</label>
                      <select
                        value={nivelRotacion} onChange={e => setNivelRotacion(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Stock Mínimo</label>
                      <input
                        type="number" value={stockMinimo} onChange={e => setStockMinimo(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Stock Máximo</label>
                      <input
                        type="number" value={stockMaximo} onChange={e => setStockMaximo(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. INFORMACIÓN FINANCIERA Y PROVEEDOR */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-blue-600">payments</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Información Financiera y Proveedor</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Precio Última Compra</label>
                      <input
                        type="text" value={formatCurrency(precioCompra, { symbol: simboloPrecioCompra })} disabled
                        className="w-full pl-4 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Costo Promedio</label>
                      <div className="relative">
                        <input
                          type="text" value={formatCurrency(costoPromedio, { symbol: simboloCostoPromedio })} disabled
                          className="w-full pl-4 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Proveedor Determinado</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person_search</span>
                      <select
                        value={proveedorId} onChange={e => setProveedorId(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value="">Buscar proveedor por nombre o RUC...</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-8">
                {/* 4. CLASIFICACIÓN */}
                <div className="bg-[#1e2532] rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20">
                  <div className="flex items-center gap-3 mb-8">
                    <span className="material-symbols-outlined text-blue-400">category</span>
                    <h3 className="text-sm font-black uppercase tracking-wider">Clasificación</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                      <CategoriaSelect
                        value={categoriaId}
                        onChange={setCategoriaId}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Material</label>
                      <TipoSelect
                        value={tipoId}
                        onChange={setTipoId}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marca</label>
                      <MarcaSelect
                        value={marcaId}
                        onChange={setMarcaId}
                        placeholder="asignar marca"
                      />
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <input
                        type="checkbox" checked={perecible} onChange={e => setPerecible(e.target.checked)}
                        className="w-5 h-5 mt-1 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <label className="block text-[11px] font-bold">producto perecible</label>
                        <p className="text-[9px] text-slate-400 mt-0.5">marque si el producto tiene una vida útil limitada</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <input
                        type="checkbox" checked={compuesto} onChange={e => setCompuesto(e.target.checked)}
                        disabled={true}
                        className="w-5 h-5 mt-1 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <label className="block text-[11px] font-bold">producto compuesto</label>
                        <p className="text-[9px] text-slate-400 mt-0.5">Producto con componentes asociados</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HELP CARD */}
                <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-8 border border-blue-100 dark:border-blue-500/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">help</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">¿Necesitas ayuda?</h4>
                      <p className="text-[11px] text-blue-600 font-bold">Consulta la guía de maestros.</p>
                    </div>
                  </div>
                  <button type="button" className="w-full py-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-500/20 rounded-xl text-[11px] font-black text-blue-600 uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                    Ver Documentación
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presentaciones' && (
            <div className="p-6 max-w-[1600px] mx-auto w-full">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">view_list</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Unidades de Presentación</h3>
                  </div>
                  <div className="flex gap-4">
                    <select
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none w-64"
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) return
                        const uni = unidades.find(u => u.id === Number(val))
                        if (uni) {
                          // Validation for duplicate unit
                          if (presentaciones.some(p => p.unidad_medida_id === uni.id)) {
                            toast.error(`La unidad ${uni.abreviatura} ya ha sido agregada como presentación.`)
                            e.target.value = "" // Reset select
                            return
                          }

                          setPresentaciones([...presentaciones, {
                            unidad_medida_id: uni.id,
                            unidad_control: false,
                            activo: true,
                            unidad_medida: uni
                          }])
                          e.target.value = "" // Reset select after adding
                        }
                      }}
                    >
                      <option value="">Buscar unidad...</option>
                      {unidades.map(u => (
                        <option key={u.id} value={u.id}>{u.descripcion} ({u.abreviatura})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <DataTable
                  columns={[
                    {
                      key: 'unidad_medida',
                      header: 'Unidad de Medida',
                      render: (p: Presentacion) => `${p.unidad_medida?.descripcion || 'N/A'} (${p.unidad_medida?.abreviatura || 'N/A'})`
                    },
                    {
                      key: 'unidad_control',
                      header: 'Control de Unidad',
                      render: (p: Presentacion) => p.unidad_control ? 'Sí' : 'No'
                    },
                    {
                      key: 'actions', header: 'Acciones',
                      render: (p: Presentacion) => (
                        <button type="button" onClick={() => setPresentaciones(presentaciones.filter(x => x.id !== p.id))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )
                    }
                  ]}
                  data={presentaciones}
                />

                {presentaciones.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">inventory</span>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No hay presentaciones registradas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sustitutos' && (
            <div className="p-6 max-w-[1600px] mx-auto w-full">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">published_with_changes</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Productos Sustitutos</h3>
                  </div>
                  <div className="flex gap-4">
                    <MaterialSelect
                      className="w-64"
                      placeholder="Buscar material sustituto..."
                      excludeIds={[materialToEdit?.id, ...sustitutos.map(s => s.sustituto_id)].filter(Boolean) as number[]}
                      onSelect={(mat) => {
                        if (!sustitutos.some(s => s.sustituto_id === mat.id)) {
                          setSustitutos([...sustitutos, { sustituto_id: mat.id, codigo: mat.codigo, descripcion: mat.descripcion }])
                        }
                      }}
                    />
                  </div>
                </div>

                <DataTable
                  columns={[
                    { key: 'codigo', header: 'Código' },
                    { key: 'descripcion', header: 'Descripción' },
                    {
                      key: 'actions', header: 'Acciones',
                      render: (s: Sustituto) => (
                        <button type="button" onClick={() => setSustitutos(sustitutos.filter(x => x.sustituto_id !== s.sustituto_id))} className="text-red-500">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )
                    }
                  ]}
                  data={sustitutos}
                />
              </div>
            </div>
          )}

          {activeTab === 'componentes' && (
            <div className="p-6 max-w-[1600px] mx-auto w-full">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 min-h-[400px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">component_exchange</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Componentes (BOM)</h3>
                  </div>
                  <MaterialSelect
                    className="w-64"
                    placeholder="Agregar componente..."
                    excludeIds={[materialToEdit?.id, ...componentes.map(c => c.componente_id)].filter(Boolean) as number[]}
                    onSelect={(mat) => {
                      if (!componentes.some(c => c.componente_id === mat.id)) {
                        setComponentes([...componentes, { componente_id: mat.id, codigo: mat.codigo, descripcion: mat.descripcion, cantidad: 1, unidad_medida_id: mat.unidad_medida_id }])
                      }
                    }}
                  />
                </div>

                <DataTable
                  columns={[
                    { key: 'codigo', header: 'Código' },
                    { key: 'descripcion', header: 'Descripción' },
                    {
                      key: 'cantidad', header: 'Cantidad',
                      render: (c: Componente) => (
                        <input
                          type="number"
                          value={c.cantidad}
                          onChange={(e) => {
                            const newComp = [...componentes]
                            const target = newComp.find(x => x.componente_id === c.componente_id)
                            if (target) target.cantidad = Number(e.target.value)
                            setComponentes(newComp)
                          }}
                          className="w-20 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-transparent rounded text-xs"
                        />
                      )
                    },
                    {
                      key: 'unidad', header: 'Unidad',
                      render: (c: Componente) => (
                        <select
                          value={c.unidad_medida_id}
                          onChange={(e) => {
                            const newComp = [...componentes]
                            const target = newComp.find(x => x.componente_id === c.componente_id)
                            if (target) target.unidad_medida_id = e.target.value ? Number(e.target.value) : undefined
                            setComponentes(newComp)
                          }}
                          className="w-32 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-transparent rounded text-xs"
                        >
                          <option value="">Seleccionar...</option>
                          {unidades.map(u => (
                            <option key={u.id} value={u.id}>{u.abreviatura} {u.descripcion}</option>
                          ))}
                        </select>
                      )
                    },
                    {
                      key: 'actions', header: 'Acciones',
                      render: (c: Componente) => (
                        <button type="button" onClick={() => setComponentes(componentes.filter(x => x.componente_id !== c.componente_id))} className="text-red-500">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )
                    }
                  ]}
                  data={componentes}
                />
              </div>
            </div>
          )}
        </form>

        {/* FOOTER AUDITORIA */}
        <div className="p-6 max-w-[1600px] mx-auto w-full">
          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creado por</label>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{materialToEdit?.creator_name || '--'} <span className="text-slate-400 font-medium ml-2">{materialToEdit?.created_at ? format(new Date(materialToEdit.created_at), 'dd/MM/yyyy HH:mm') : ''}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última modificación</label>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{materialToEdit?.updater_name || 'Sin cambios registrados'} <span className="text-slate-400 font-medium ml-2">{materialToEdit?.updated_at ? format(new Date(materialToEdit.updated_at), 'dd/MM/yyyy HH:mm') : ''}</span></p>
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
        </div>
      </div>
    </div>
  )
}
