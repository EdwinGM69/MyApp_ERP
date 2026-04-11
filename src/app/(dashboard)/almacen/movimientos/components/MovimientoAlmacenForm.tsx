'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MaterialSelect from '@/components/ui/MaterialSelect'

interface Distribucion {
  id: string
  numero_lote?: string
  fecha_expiracion?: string
  ubicacion_id: number
  cantidad: number
}

interface ProductoLinea {
  id: string
  material_id?: number
  material_codigo: string
  material_descripcion: string
  um: string
  unidad_medida_id?: number
  lote: string
  vencimiento: string
  cantidad: number
  valor: number | string
  moneda: string
  almacen_id: number
  estado_stock_id: number
  stock_lote?: boolean
  esquema_id?: number
  ubicacion_default_id?: number
  perecible?: boolean
  // New fields
  sucursal_dst_id?: number
  almacen_dst_id?: number
  expandido?: boolean
  distribuciones: Distribucion[]
  stock_actual?: number | null
}

export default function MovimientoAlmacenForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Master data
  const [sucursales, setSucursales] = useState<any[]>([])
  const [almacenes, setAlmacenes] = useState<any[]>([])
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([])
  const [estadosStock, setEstadosStock] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [ubicaciones, setUbicaciones] = useState<any[]>([])

  // Header state
  const [sucursalId, setSucursalId] = useState<number>(1)
  const [tipoOperacionId, setTipoOperacionId] = useState<number>(1)
  const [documento, setDocumento] = useState('')
  const [fecha, setFecha] = useState('')
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [numeroPedido, setNumeroPedido] = useState('')

  // Lines state
  const [lineas, setLineas] = useState<ProductoLinea[]>([])

  // Derivados
  const selectedTipo = tiposOperacion.find(t => t.id === Number(tipoOperacionId))

  // Fetch stock for a given line
  const fetchStockLinea = useCallback(async (
    index: number,
    linea: ProductoLinea,
    overrides?: Partial<ProductoLinea>
  ) => {
    const merged = { ...linea, ...overrides }
    if (!merged.material_id) return
    try {
      const params = new URLSearchParams({
        summary: 'true',
        sucursalId: String(sucursalId),
        almacenId: String(merged.almacen_id),
        estadoStockId: String(merged.estado_stock_id),
        materialId: String(merged.material_id),
        ...(merged.unidad_medida_id ? { unidadMedidaId: String(merged.unidad_medida_id) } : {}),
      })
      const res = await apiFetch(`/api/stock?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setLineas(prev => {
        const updated = [...prev]
        if (updated[index]) updated[index] = { ...updated[index], stock_actual: json.total ?? 0 }
        return updated
      })
    } catch { /* swallow */ }
  }, [sucursalId])

  // Reset fields when tipo changes
  useEffect(() => {
    if (selectedTipo) {
      if (!selectedTipo.requiere_cliente) setClienteId(null)
      if (!selectedTipo.requiere_proveedor) setProveedorId(null)
      if (!selectedTipo.requiere_pedido) setNumeroPedido('')

      if (selectedTipo.estado_stock_id) {
        setLineas(prev => prev.map(l => ({ ...l, estado_stock_id: selectedTipo.estado_stock_id })))
      }
    }
  }, [tipoOperacionId, selectedTipo])

  // Load master data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resSuc, resAlm, resTip, resEst, resCli, resPro, resUbi] = await Promise.all([
          apiFetch('/api/empresa/sucursales'),
          apiFetch('/api/logistica/almacenes?pageSize=100'),
          apiFetch('/api/logistica/tipos-operacion?pageSize=100'),
          apiFetch('/api/estados-stock?pageSize=100'),
          apiFetch('/api/clientes?pageSize=100'),
          apiFetch('/api/proveedores?pageSize=100'),
          apiFetch('/api/logistica/ubicaciones?pageSize=100')
        ])

        const extract = async (res: Response) => {
          if (!res.ok) return []
          const json = await res.json()
          return Array.isArray(json) ? json : (json.data || [])
        }

        const [suc, alm, tip, est, cli, pro, ubi] = await Promise.all([
          extract(resSuc),
          extract(resAlm),
          extract(resTip),
          extract(resEst),
          extract(resCli),
          extract(resPro),
          extract(resUbi)
        ])

        setSucursales(suc)
        setAlmacenes(alm)
        setTiposOperacion(tip)
        setEstadosStock(est)
        setClientes(cli)
        setProveedores(pro)
        setUbicaciones(ubi)

        setIsReady(true)
      } catch (error) {
        console.error('Error loading master data:', error)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    setMounted(true)
    setFecha(new Date().toISOString().split('T')[0])
  }, [])

  const addLinea = () => {
    // Find "Disponible" ID if available, otherwise default to 1
    const disponible = estadosStock.find(e => e.descripcion.toLowerCase() === 'disponible' || e.codigo.toLowerCase() === 'disponible')
    const defaultEstadoId = selectedTipo?.estado_stock_id || (disponible ? disponible.id : 1)

    const newLinea: ProductoLinea = {
      id: Math.random().toString(36).substring(2, 11),
      material_codigo: '',
      material_descripcion: '',
      um: 'UND',
      lote: '',
      vencimiento: '',
      cantidad: 1,
      valor: '0.00',
      moneda: 'PEN',
      almacen_id: 1,
      estado_stock_id: defaultEstadoId,
      distribuciones: [],
      expandido: false
    }
    setLineas([...lineas, newLinea])
  }

  const removeLinea = (index: number) => {
    setLineas(lineas.filter((_, i) => i !== index))
  }

  /** Helper: redistribute `total` among `n` slots. If total is integer, use floor + remainder to last. */
  const distribuirProporcional = (distribuciones: Distribucion[], totalNuevo: number): Distribucion[] => {
    const n = distribuciones.length
    if (n === 0) return distribuciones
    const totalActual = distribuciones.reduce((s, d) => s + (parseFloat(String(d.cantidad)) || 0), 0)
    const esEntero = Number.isInteger(totalNuevo)
    return distribuciones.map((d, i) => {
      const proporcion = totalActual > 0 ? (parseFloat(String(d.cantidad)) || 0) / totalActual : 1 / n
      if (i < n - 1) {
        const valor = esEntero ? Math.floor(proporcion * totalNuevo) : parseFloat((proporcion * totalNuevo).toFixed(4))
        return { ...d, cantidad: valor }
      } else {
        const sumPrev = distribuciones.slice(0, n - 1).reduce((s, d2) => {
          const p2 = totalActual > 0 ? (parseFloat(String(d2.cantidad)) || 0) / totalActual : 1 / n
          return s + (esEntero ? Math.floor(p2 * totalNuevo) : parseFloat((p2 * totalNuevo).toFixed(4)))
        }, 0)
        const remainder = esEntero ? totalNuevo - sumPrev : parseFloat((totalNuevo - sumPrev).toFixed(4))
        return { ...d, cantidad: remainder }
      }
    })
  }

  const handleLineaChange = (index: number, field: keyof ProductoLinea, value: any) => {
    const newLineas = [...lineas]
    newLineas[index] = { ...newLineas[index], [field]: value }
    setLineas(newLineas)
    // Re-fetch stock if relevant fields change
    if (field === 'almacen_id' || field === 'estado_stock_id') {
      fetchStockLinea(index, newLineas[index])
    }
  }

  const handleMaterialSelect = async (index: number, material: any) => {
    const estaIngreso = selectedTipo?.signo_origen === '+'
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]

    // Fetch active cost from MaterialCosto endpoint
    let costoValue = '0.00'
    try {
      const costRes = await apiFetch(`/api/materiales/costo?materialId=${material.id}`)
      if (costRes.ok) {
        const costJson = await costRes.json()
        costoValue = Number(costJson.costo ?? 0).toFixed(2)
      }
    } catch { /* swallow, fallback to 0 */ }

    // Set defaults for distribuciones based on material flags and operation type
    const initialDist: Distribucion = { 
      id: Math.random().toString(36).substring(2, 11), 
      ubicacion_id: material.ubicacion_default_id || 0, 
      cantidad: currentLinea.cantidad 
    }
    const updatedDists = (currentLinea.distribuciones.length > 0
      ? currentLinea.distribuciones
      : [initialDist]
    ).map(d => ({
      ...d,
      numero_lote: (estaIngreso && material.stock_lote) ? (d.numero_lote || '') : '---',
      fecha_expiracion: (estaIngreso && material.perecible) ? (d.fecha_expiracion || '') : undefined,
    }))

    newLineas[index] = {
      ...currentLinea,
      material_id: material.id,
      material_codigo: material.codigo,
      material_descripcion: material.descripcion,
      um: material.unidad_medida?.descripcion || 'UND',
      unidad_medida_id: material.unidad_medida_id,
      valor: costoValue,
      stock_lote: material.stock_lote,
      perecible: material.perecible,
      esquema_id: material.esquema_id,
      ubicacion_default_id: material.ubicacion_default_id,
      lote: (estaIngreso && material.stock_lote) ? currentLinea.lote : '',
      distribuciones: updatedDists,
    }
    setLineas(newLineas)
    // Fetch stock for selected material
    fetchStockLinea(index, newLineas[index])
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (lineas.length === 0) {
      toast.error('Debe agregar al menos una línea de producto')
      return
    }

    if (selectedTipo?.requiere_pedido && !numeroPedido.trim()) {
      toast.error('El número de pedido es mandatorio para esta operación')
      return
    }

    setLoading(true)
    try {
      const payload = {
        sucursal_id: Number(sucursalId),
        tipo_operacion_id: Number(tipoOperacionId),
        documento,
        referencia,
        observaciones,
        cliente_id: clienteId,
        proveedor_id: proveedorId,
        numero_pedido: numeroPedido,
        detalles: lineas.map((l, idx) => ({
          linea: (idx + 1).toString(),
          sucursal_id: Number(sucursalId),
          almacen_id: Number(l.almacen_id),
          estado_stock_id: Number(l.estado_stock_id),
          numero_lote: l.lote || null,
          material_id: l.material_id,
          material_codigo: l.material_codigo,
          cantidad: Number(l.cantidad),
          costo_unit: Number(l.valor),
          esquema_id: l.esquema_id,
          distribuciones: l.distribuciones.map(d => ({
            numero_lote: d.numero_lote || null,
            fecha_expiracion: d.fecha_expiracion ? new Date(d.fecha_expiracion).toISOString() : null,
            ubicacion_id: d.ubicacion_id || null, // UI could send 0 or missing, let backend handle it
            cantidad: Number(d.cantidad)
          }))
        }))
      }

      const res = await apiFetch('/api/almacen', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json()
        const errMsg = Array.isArray(json.error) 
          ? json.error.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') 
          : (json.error || 'Error al guardar el movimiento')
        throw new Error(errMsg)
      }

      toast.success('Movimiento registrado correctamente')
      router.push('/almacen/movimientos')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isReady) return null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Sticky Header (Full Width) */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md py-4 border-b border-slate-100 dark:border-slate-800 px-8 transition-all">
        <div className="flex items-center justify-between mx-auto">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push('/almacen/movimientos')}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                <span>ALMACÉN</span>
                <span className="text-slate-200 dark:text-slate-800">/</span>
                <span>MOVIMIENTOS</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Nuevo Movimiento
                </h1>
                {selectedTipo?.signo_origen && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest",
                    selectedTipo.signo_origen === '+'
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {selectedTipo.signo_origen} Stock
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleSave()}
              disabled={loading}
              className="px-8 h-12 flex items-center justify-center gap-3 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-[11px] font-black uppercase tracking-[0.1em]"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Guardar Registro
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Izquierda: Datos Generales */}
        <aside className="w-[300px] h-full overflow-y-auto bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-3 py-6 flex flex-col gap-4 custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">SUCURSAL ORIGEN</label>
              <select value={sucursalId} onChange={(e) => setSucursalId(Number(e.target.value))}
                className="w-full px-5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.descripcion}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">TIPO DE OPERACIÓN</label>
              <select value={tipoOperacionId} onChange={(e) => setTipoOperacionId(Number(e.target.value))}
                className="w-full px-5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                {tiposOperacion.map(t => <option key={t.id} value={t.id}>[{t.codigo}] {t.descripcion}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">DOCUMENTO</label>
                <input type="text" placeholder="G001..." value={documento} onChange={(e) => setDocumento(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">FECHA</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
              </div>
            </div>

            {selectedTipo?.requiere_cliente && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CLIENTE (Opcional)</label>
                <select value={clienteId || ''} onChange={(e) => setClienteId(Number(e.target.value) || null)}
                  className="w-full px-5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                  <option value="">- SELECCIONAR CLIENTE -</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            {selectedTipo?.requiere_proveedor && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">PROVEEDOR (Opcional)</label>
                <select value={proveedorId || ''} onChange={(e) => setProveedorId(Number(e.target.value) || null)}
                  className="w-full px-5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                  <option value="">- SELECCIONAR PROVEEDOR -</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            {selectedTipo?.requiere_pedido && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">N° DE PEDIDO (Mandatorio)</label>
                <input type="text" placeholder="PED-2024-001..." value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value.toUpperCase())}
                  className="w-full px-5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">REFERENCIA / NOTAS</label>
              <textarea rows={2} placeholder="Ingrese una referencia..." value={referencia} onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-5 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none" />
            </div>
          </div>

        </aside>
        {/* Área Principal: Detalle de Movimiento */}
        <main className="flex-1 h-full overflow-y-auto px-8 py-6 flex flex-col gap-8 custom-scrollbar bg-white dark:bg-slate-950">

          {/* Totals Summary Bar - Refined Unified Dark Card */}
          <div className="bg-slate-900 dark:bg-slate-900/60 backdrop-blur-md rounded-[20px] p-4 flex items-center shadow-xl shadow-slate-900/10 border border-slate-800/50">
            {/* Section 1: Items */}
            <div className="flex-1 flex flex-col items-center px-6 border-r border-slate-700/50">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Ítems</span>
              <span className="text-xl font-black text-white leading-none">{lineas.length}</span>
            </div>

            {/* Section 2: Unidades */}
            <div className="flex-1 flex flex-col items-center px-6 border-r border-slate-700/50">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Unidades</span>
              <span className="text-xl font-black text-white leading-none">
                {lineas.reduce((acc, l) => acc + (parseFloat(l.cantidad.toString()) || 0), 0)}
              </span>
            </div>

            {/* Section 3: Valor Total */}
            <div className="flex-1 flex flex-col items-center px-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Valor Total (PEN)</span>
              <span className="text-xl font-black text-blue-400 leading-none">
                {lineas.reduce((acc, l) => acc + ((parseFloat(l.cantidad.toString()) || 0) * (parseFloat(l.valor.toString()) || 0)), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Lines Table Section - Transparent Layout */}
          <div className="flex flex-col flex-1">
            <div className="pb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] leading-none mb-1">Materiales Seleccionados</h3>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Registre los materiales y productos para este movimiento.</p>
              </div>
              <button type="button" onClick={addLinea}
                className="px-6 h-11 rounded-2xl bg-blue-600 text-white font-black text-[11px] hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Añadir Línea
              </button>
            </div>

            <div className="flex-1 overflow-auto space-y-4 pb-12 pr-1 custom-scrollbar">
              {lineas.map((linea, index) => (
                <div key={linea.id} className={cn(
                  "rounded-[22px] border transition-all duration-300 shadow-sm overflow-hidden",
                  linea.expandido
                    ? "bg-slate-50 dark:bg-slate-900/50 border-blue-200 dark:border-blue-900 shadow-blue-500/5"
                    : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}>
                  {/* Card Header (Main Data) */}
                  <div className="p-3 px-5 flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-2 border-r border-slate-100 dark:border-slate-800">
                      <span className="text-[13px] font-black text-blue-600 leading-none">{(index + 1).toString().padStart(2, '0')}</span>
                      <button type="button" onClick={() => removeLinea(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                      {/* Material Section */}
                      <div className={cn("space-y-0", selectedTipo?.requiere_suc_destino ? "col-span-5" : "col-span-4")}>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Material / Producto</label>
                        <MaterialSelect
                          selectedLabel={lineas[index].material_descripcion}
                          onSelect={(m) => handleMaterialSelect(index, m)}
                          placeholder="Buscar material..."
                        />
                        {linea.material_descripcion && (
                          <div className="flex items-center justify-between gap-2 mt-1 px-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-blue-600 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-600/10 rounded-lg">{lineas[index].um}</span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-tight truncate">{linea.material_codigo}</span>
                            </div>
                            {linea.stock_actual !== undefined && linea.stock_actual !== null && (
                              <span className={cn(
                                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg tracking-widest",
                                linea.stock_actual > 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                STOCK {linea.stock_actual}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Basic Settings */}
                      <div className="col-span-2 space-y-0">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{selectedTipo?.requiere_suc_destino ? "Almacén/Tipo Stock" : "Almacén/Tipo Stock"}</label>
                        <div className="flex flex-col gap-0.5">
                          <select value={linea.almacen_id} onChange={e => handleLineaChange(index, 'almacen_id', Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1 py-0 h-[18px] rounded text-[7.5px] font-bold outline-none uppercase transition-all focus:border-blue-500 appearance-none leading-none">
                            {almacenes.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
                          </select>
                          <select value={linea.estado_stock_id} onChange={e => handleLineaChange(index, 'estado_stock_id', Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1 py-0 h-[18px] rounded text-[7.5px] font-bold outline-none uppercase transition-all focus:border-blue-500 appearance-none leading-none">
                            {estadosStock.map(e => <option key={e.id} value={e.id}>{e.codigo}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Numeric Inputs */}
                      <div className={cn("grid gap-2", selectedTipo?.requiere_suc_destino ? "col-span-3 grid-cols-2" : "col-span-6 grid-cols-4")}>
                        <div className="space-y-0">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linea.cantidad}
                            onBlur={e => {
                              // Parse final value and redistribute proportionally
                              const totalNuevo = isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)
                              setLineas(prev => {
                                const updated = [...prev]
                                const nuevosDists = distribuirProporcional(updated[index].distribuciones, totalNuevo)
                                updated[index] = { ...updated[index], cantidad: totalNuevo, distribuciones: nuevosDists }
                                return updated
                              })
                            }}
                            onChange={e => {
                              const v = e.target.value
                              if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                                // Only update display value, no redistribution during typing
                                setLineas(prev => {
                                  const updated = [...prev]
                                  updated[index] = { ...updated[index], cantidad: v.replace(',', '.') as any }
                                  return updated
                                })
                              }
                            }}
                            className="w-full max-w-[70px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-1 rounded-xl text-[10px] font-bold outline-none text-right transition-all focus:border-blue-500" />
                        </div>
                        <div className="space-y-0">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo Unit.</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linea.valor}
                            disabled={!selectedTipo?.permite_precio_costo}
                            onBlur={e => handleLineaChange(index, 'valor', isNaN(parseFloat(e.target.value)) ? '0.00' : parseFloat(e.target.value).toFixed(2))}
                            onChange={e => {
                              const v = e.target.value
                              if (/^[0-9]*[.,]?[0-9]*$/.test(v)) handleLineaChange(index, 'valor', v.replace(',', '.'))
                            }}
                            onFocus={e => {
                              if (e.target.value === '0.00' || e.target.value === '0') handleLineaChange(index, 'valor', '')
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-[11px] font-black text-blue-600 dark:text-blue-400 outline-none text-right transition-all focus:border-blue-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:opacity-50" />
                        </div>
                        {!selectedTipo?.requiere_suc_destino && (
                          <div className="flex items-center justify-center pt-4">
                            <button type="button" onClick={() => handleLineaChange(index, 'expandido', !linea.expandido)}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
                                linea.expandido ? "bg-blue-600 text-white border-blue-600 rotate-180" : "bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800"
                              )}>
                              <span className="material-symbols-outlined text-[18px]">expand_more</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Destination Section (Conditional) - MOVED AFTER NUMERIC */}
                      {selectedTipo?.requiere_suc_destino && (
                        <div className="col-span-2 space-y-0">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Suc./Alm. Destino</label>
                          <div className="flex flex-col gap-0.5 max-w-[100px]">
                            <select value={linea.sucursal_dst_id || ''} onChange={e => handleLineaChange(index, 'sucursal_dst_id', Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1 py-0 h-[18px] rounded text-[7.5px] font-bold outline-none uppercase transition-all focus:border-blue-500 appearance-none leading-none">
                              <option value="">- SUCURSAL -</option>
                              {sucursales.map(s => <option key={s.id} value={s.id}>{s.descripcion}</option>)}
                            </select>
                            <select value={linea.almacen_dst_id || ''} onChange={e => handleLineaChange(index, 'almacen_dst_id', Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1 py-0 h-[18px] rounded text-[7.5px] font-bold outline-none uppercase transition-all focus:border-blue-500 appearance-none leading-none">
                              <option value="">- ALMACÉN -</option>
                              {almacenes.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedTipo?.requiere_suc_destino && (
                      <div className="flex items-center pt-4">
                        <button type="button" onClick={() => handleLineaChange(index, 'expandido', !linea.expandido)}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
                            linea.expandido ? "bg-blue-600 text-white border-blue-600 rotate-180" : "bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800"
                          )}>
                          <span className="material-symbols-outlined text-[18px]">expand_more</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Sub-section (Distributions) */}
                  {linea.expandido && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/20">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-600 text-[18px]">category</span>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Distribución de stock</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{linea.distribuciones.length} distribución(es)</span>
                      </div>

                      <div className="space-y-2">
                        {linea.distribuciones.map((dist, dIdx) => (
                          <div key={dist.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-1">
                            <div className="flex-1 grid grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Lote</label>
                                <input type="text" value={dist.numero_lote || ''}
                                  disabled={selectedTipo?.signo_origen !== '+' || !linea.stock_lote}
                                  onChange={e => {
                                    const newDists = [...linea.distribuciones];
                                    newDists[dIdx].numero_lote = e.target.value.toUpperCase();
                                    handleLineaChange(index, 'distribuciones', newDists);
                                  }}
                                  placeholder="N° LOTE"
                                  className="w-full bg-slate-50 dark:bg-slate-900 border-none px-3 py-1.5 rounded-lg text-[12px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiración</label>
                                <input type="date" value={dist.fecha_expiracion || ''}
                                  disabled={selectedTipo?.signo_origen !== '+' || !linea.perecible}
                                  onChange={e => {
                                    const newDists = [...linea.distribuciones];
                                    newDists[dIdx].fecha_expiracion = e.target.value;
                                    handleLineaChange(index, 'distribuciones', newDists);
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border-none px-3 py-1.5 rounded-lg text-[12px] font-bold outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                                <select value={dist.ubicacion_id} onChange={e => {
                                  const newDists = [...linea.distribuciones];
                                  newDists[dIdx].ubicacion_id = Number(e.target.value);
                                  handleLineaChange(index, 'distribuciones', newDists);
                                }}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border-none px-3 py-1.5 rounded-lg text-[12px] font-bold outline-none uppercase focus:ring-1 focus:ring-blue-500">
                                  <option value="0">- SELECCIONAR -</option>
                                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.descripcion}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={dist.cantidad}
                                  onBlur={e => {
                                    const raw = isNaN(parseFloat(String(e.target.value))) ? 0 : parseFloat(String(e.target.value))
                                    const lineaCantidad = parseFloat(String(linea.cantidad)) || 0
                                    // Sum all OTHER distributions
                                    const sumOtros = linea.distribuciones.reduce((s, d, i) =>
                                      i === dIdx ? s : s + (parseFloat(String(d.cantidad)) || 0), 0)
                                    // Cap so total doesn't exceed linea.cantidad
                                    const maxPermitido = Math.max(0, lineaCantidad - sumOtros)
                                    const newDists = [...linea.distribuciones]
                                    newDists[dIdx] = { ...newDists[dIdx], cantidad: Math.min(raw, maxPermitido) }
                                    handleLineaChange(index, 'distribuciones', newDists)
                                  }}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                                      const newDists = [...linea.distribuciones];
                                      newDists[dIdx].cantidad = v.replace(',', '.') as any;
                                      handleLineaChange(index, 'distribuciones', newDists);
                                    }
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border-none px-3 py-1.5 rounded-lg text-[12px] font-black outline-none text-right focus:ring-1 focus:ring-blue-500" />
                              </div>
                            </div>
                            <button type="button"
                              onClick={() => {
                                const newDists = linea.distribuciones.filter((_, i) => i !== dIdx);
                                handleLineaChange(index, 'distribuciones', newDists);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all self-end mb-0.5">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ))}

                        <button type="button"
                          onClick={() => {
                            const loteDisabled = selectedTipo?.signo_origen !== '+' || !linea.stock_lote
                            const expDisabled = selectedTipo?.signo_origen !== '+' || !linea.perecible
                            const isFirst = linea.distribuciones.length === 0
                            const sumExistente = isFirst ? 0 : linea.distribuciones.reduce((acc, d) => acc + (parseFloat(String(d.cantidad)) || 0), 0)
                            const nuevaCantidad = isFirst
                              ? (parseFloat(String(linea.cantidad)) || 0)
                              : Math.max(0, (parseFloat(String(linea.cantidad)) || 0) - sumExistente)
                            const newDist: Distribucion = {
                              id: Math.random().toString(36).substring(2, 11),
                              ubicacion_id: linea.ubicacion_default_id || 0,
                              cantidad: nuevaCantidad,
                              numero_lote: loteDisabled ? '---' : '',
                              fecha_expiracion: expDisabled ? undefined : '',
                            };
                            const newDists = [...linea.distribuciones, newDist];
                            handleLineaChange(index, 'distribuciones', newDists);
                          }}
                          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          + Agregar distribución
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {lineas.length === 0 && (
                <div className="py-32 text-center text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl opacity-20 font-light">inventory_2</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sin materiales registrados</p>
                  <p className="text-[11px] mt-3 font-medium opacity-60">Utilice el botón superior para añadir líneas al movimiento</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  )
}
