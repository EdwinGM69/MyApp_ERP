'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MaterialSelect from '@/components/ui/MaterialSelect'
import { useSucursal } from '@/contexts/SucursalContext'
import * as XLSX from 'xlsx'

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
  unidad_medida_control_id?: number
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
  presentaciones: any[]
  unidad_multiplo?: number
  ubicaciones_disponibles?: any[]
}

export default function MovimientoAlmacenForm() {
  const router = useRouter()
  const { currentSucursal } = useSucursal()
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
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([])

  // Header state
  const [sucursalId, setSucursalId] = useState<number>(currentSucursal?.id || 1)
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

  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const unidadMedidaControlId = merged.unidad_medida_control_id || merged.unidad_medida_id
      const params = new URLSearchParams({
        summary: 'true',
        sucursalId: String(sucursalId),
        almacenId: String(merged.almacen_id),
        estadoStockId: String(merged.estado_stock_id),
        materialId: String(merged.material_id),
        ...(unidadMedidaControlId ? { unidadMedidaId: String(unidadMedidaControlId) } : {}),
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

  // Fetch available locations for subtraction operations
  const fetchUbicacionesDisponibles = useCallback(async (
    index: number,
    linea: ProductoLinea,
    overrides?: Partial<ProductoLinea>
  ) => {
    const merged = { ...linea, ...overrides }
    if (!merged.material_id || selectedTipo?.signo_origen !== '-') return
    try {
      const unidadMedidaControlId = merged.unidad_medida_control_id || merged.unidad_medida_id
      const params = new URLSearchParams({
        summary: 'false',
        sucursalId: String(sucursalId),
        almacenId: String(merged.almacen_id),
        estadoStockId: String(merged.estado_stock_id),
        materialId: String(merged.material_id),
        ...(unidadMedidaControlId ? { unidadMedidaId: String(unidadMedidaControlId) } : {}),
      })
      const res = await apiFetch(`/api/stock?${params}`)
      if (!res.ok) return
      const json = await res.json()
      const stockData = Array.isArray(json) ? json : (json.data || [])
      // Filter locations with quantity > 0
      const ubicacionIdsConStock = (stockData as any[])
        .filter((item: any) => (item.cantidad || 0) > 0)
        .map((item: any) => item.ubicacion_id)
        .filter((id, idx, arr) => arr.indexOf(id) === idx) // unique
      // Filter master ubicaciones list
      const ubicacionesDisponibles = ubicaciones.filter(u => ubicacionIdsConStock.includes(u.id))
      setLineas(prev => {
        const updated = [...prev]
        if (updated[index]) updated[index] = { ...updated[index], ubicaciones_disponibles: ubicacionesDisponibles }
        return updated
      })
    } catch { /* swallow */ }
  }, [sucursalId, selectedTipo?.signo_origen, ubicaciones])

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
        const [resSuc, resTip, resEst, resCli, resPro, resUbi, resUnidades] = await Promise.all([
          apiFetch('/api/empresa/sucursales'),
          apiFetch('/api/logistica/tipos-operacion?pageSize=100'),
          apiFetch('/api/estados-stock?pageSize=100'),
          apiFetch('/api/clientes?pageSize=100'),
          apiFetch('/api/proveedores?pageSize=100'),
          apiFetch('/api/logistica/ubicaciones?pageSize=100'),
          apiFetch('/api/unidades-medida?pageSize=100')
        ])

        const extract = async (res: Response) => {
          if (!res.ok) return []
          const json = await res.json()
          return Array.isArray(json) ? json : (json.data || [])
        }

        const [suc, tip, est, cli, pro, ubi, unidades] = await Promise.all([
          extract(resSuc),
          extract(resTip),
          extract(resEst),
          extract(resCli),
          extract(resPro),
          extract(resUbi),
          extract(resUnidades)
        ])

        setSucursales(suc)
        setTiposOperacion(tip)
        setEstadosStock(est)
        setClientes(cli)
        setProveedores(pro)
        setUbicaciones(ubi)
        setUnidadesMedida(unidades)

        setIsReady(true)
      } catch (error) {
        console.error('Error loading master data:', error)
      }
    }
    loadData()
  }, [])

  // Load almacenes when sucursalId changes
  useEffect(() => {
    const loadAlmacenes = async () => {
      if (!sucursalId) return
      try {
        const res = await apiFetch(`/api/logistica/almacenes?pageSize=100&sucursalId=${sucursalId}`)
        if (res.ok) {
          const json = await res.json()
          setAlmacenes(Array.isArray(json) ? json : (json.data || []))
        }
      } catch (error) {
        console.error('Error loading almacenes:', error)
      }
    }
    loadAlmacenes()
  }, [sucursalId])

  useEffect(() => {
    setMounted(true)
    setFecha(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (currentSucursal?.id) {
      setSucursalId(currentSucursal.id)
    }
  }, [currentSucursal])

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
      expandido: false,
      presentaciones: []
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

  const handleLineaChange = async (index: number, field: keyof ProductoLinea, value: any) => {
    const newLineas = [...lineas]
    newLineas[index] = { ...newLineas[index], [field]: value }
    setLineas(newLineas)

    if (field === 'almacen_id' || field === 'estado_stock_id') {
      fetchStockLinea(index, newLineas[index])
      fetchUbicacionesDisponibles(index, newLineas[index])
    } else if (field === 'unidad_medida_id') {
      // Fetch new multiplier when unit changes
      try {
        const umRes = await apiFetch(`/api/logistica/unidades?id=${value}`)
        if (umRes.ok) {
          const umJson = await umRes.json()
          const newMultiplo = Number(umJson.data?.unidad_multiplo) || 1
          setLineas(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], unidad_multiplo: newMultiplo }
            return updated
          })
        }
      } catch { /* swallow */ }
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
    } catch { /* swallow */ }

    // Fetch presentaciones for the material
    let presentaciones = []
    try {
      const presRes = await apiFetch(`/api/materiales/presentaciones?materialId=${material.id}`)
      if (presRes.ok) {
        const presJson = await presRes.json()
        presentaciones = Array.isArray(presJson) ? presJson : (presJson.data || [])
      }
    } catch { /* swallow */ }

    // Fetch unidad_multiplo for the material's unit
    let unidadMultiplo = 1
    try {
      const umRes = await apiFetch(`/api/logistica/unidades?id=${material.unidad_medida_id}`)
      if (umRes.ok) {
        const umJson = await umRes.json()
        unidadMultiplo = Number(umJson.data?.unidad_multiplo) || 1
      }
    } catch { /* swallow */ }

    // Set defaults for distribuciones based on material flags and operation type
    const initialDist: Distribucion = {
      id: Math.random().toString(36).substring(2, 11),
      ubicacion_id: material.ubicacion_default_id || 0,
      cantidad: currentLinea.cantidad * unidadMultiplo
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
      unidad_medida_control_id: material.unidad_medida_id,
      valor: costoValue,
      stock_lote: material.stock_lote,
      perecible: material.perecible,
      esquema_id: material.esquema_id,
      ubicacion_default_id: material.ubicacion_default_id,
      lote: (estaIngreso && material.stock_lote) ? currentLinea.lote : '',
      distribuciones: updatedDists,
      presentaciones,
      unidad_multiplo: unidadMultiplo,
    }
    setLineas(newLineas)
    // Fetch stock for selected material
    fetchStockLinea(index, newLineas[index])
    // Fetch available locations for subtraction operations
    fetchUbicacionesDisponibles(index, newLineas[index])
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets['Datos'] || workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) {
        toast.error('El archivo no contiene una hoja de datos.')
        return
      }

      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 }) as any[][]

      if (rows.length < 4) {
        toast.error('El archivo debe tener al menos 4 filas (encabezados en fila 3, datos desde fila 4).')
        return
      }

      const headers = rows[2] as string[]
      const fieldIndex: Record<string, number> = {}
      headers.forEach((h, idx) => {
        if (h) fieldIndex[String(h).trim().toLowerCase()] = idx
      })

      const codigoIdx = fieldIndex['codigo']
      const cantidadIdx = fieldIndex['cantidad']
      const costoIdx = fieldIndex['costo_promedio']

      if (codigoIdx === undefined || cantidadIdx === undefined) {
        toast.error('La plantilla debe contener las columnas "codigo" y "cantidad".')
        return
      }

      const rawRows: { codigo: string; cantidad: number; costo_promedio?: number; rowNum: number }[] = []
      const codigosSeen = new Set<string>()

      for (let i = 3; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.every((cell: any) => cell === undefined || cell === null || cell === '')) continue

        const codigo = String(row[codigoIdx] ?? '').trim()
        if (!codigo) {
          toast.error(`Fila ${i + 1}: el código no puede estar vacío.`)
          return
        }

        if (codigosSeen.has(codigo.toLowerCase())) {
          toast.error(`Código duplicado en el Excel: "${codigo}" (fila ${i + 1}).`)
          return
        }
        codigosSeen.add(codigo.toLowerCase())

        const cantidad = Number(row[cantidadIdx])
        if (isNaN(cantidad) || cantidad <= 0) {
          toast.error(`Fila ${i + 1}: cantidad inválida para el código "${codigo}".`)
          return
        }

        const costo_promedio = costoIdx !== undefined ? Number(row[costoIdx]) : undefined

        rawRows.push({ codigo, cantidad, costo_promedio: isNaN(costo_promedio ?? NaN) ? undefined : costo_promedio, rowNum: i + 1 })
      }

      if (rawRows.length === 0) {
        toast.error('No se encontraron datos para importar.')
        return
      }

      // Look up materials by unique codigos
      const uniqueCodigos = [...new Set(rawRows.map(r => r.codigo))]
      const materialMap = new Map<string, any>()
      const presentacionesMap = new Map<number, any[]>()
      const unidadMultiploMap = new Map<number, number>()

      for (const codigo of uniqueCodigos) {
        const res = await apiFetch(`/api/materiales?search=${encodeURIComponent(codigo)}&pageSize=1`)
        if (!res.ok) {
          toast.error(`Error al buscar material con código "${codigo}".`)
          return
        }
        const json = await res.json()
        const data = Array.isArray(json) ? json : (json.data || [])
        const material = data.find((m: any) => m.codigo?.toLowerCase() === codigo.toLowerCase())
        if (!material) {
          toast.error(`Material con código "${codigo}" no encontrado en el sistema.`)
          return
        }
        materialMap.set(codigo.toLowerCase(), material)

        // Fetch presentaciones for this material
        let presentaciones: any[] = []
        try {
          const presRes = await apiFetch(`/api/materiales/presentaciones?materialId=${material.id}`)
          if (presRes.ok) {
            const presJson = await presRes.json()
            presentaciones = Array.isArray(presJson) ? presJson : (presJson.data || [])
          }
        } catch { /* swallow */ }
        presentacionesMap.set(material.id, presentaciones)

        // Fetch unidad_multiplo
        const umId = material.unidad_medida_rel?.id || material.unidad_medida_id
        if (umId) {
          try {
            const umRes = await apiFetch(`/api/logistica/unidades?id=${umId}`)
            if (umRes.ok) {
              const umJson = await umRes.json()
              unidadMultiploMap.set(material.id, Number(umJson.data?.unidad_multiplo) || 1)
            }
          } catch { /* swallow */ }
        }
      }

      const estaIngreso = selectedTipo?.signo_origen === '+'
      const esSalida = selectedTipo?.signo_origen === '-'
      const disponible = estadosStock.find(e => e.descripcion.toLowerCase() === 'disponible' || e.codigo.toLowerCase() === 'disponible')
      const defaultEstadoId = selectedTipo?.estado_stock_id || (disponible ? disponible.id : 1)

      // Pre-fetch stock for all unique materials (same as fetchStockLinea)
      const stockActualMap = new Map<number, number>()
      for (const [, material] of materialMap) {
        try {
          const umControlId = material.unidad_medida_rel?.id || material.unidad_medida_id
          const params = new URLSearchParams({
            summary: 'true',
            sucursalId: String(sucursalId),
            almacenId: '1',
            estadoStockId: String(defaultEstadoId),
            materialId: String(material.id),
            ...(umControlId ? { unidadMedidaId: String(umControlId) } : {}),
          })
          const stockRes = await apiFetch(`/api/stock?${params}`)
          if (stockRes.ok) {
            const stockJson = await stockRes.json()
            stockActualMap.set(material.id, stockJson.total ?? 0)
          }
        } catch { /* swallow */ }
      }

      const nuevasLineas: ProductoLinea[] = []
      let stockInsuficiente = false

      for (const row of rawRows) {
        const material = materialMap.get(row.codigo.toLowerCase())!

        // Determine cost
        let costoValue = '0.00'
        if (esSalida) {
          // Salida: always fetch last active cost from MaterialCosto (same as handleMaterialSelect)
          try {
            const costRes = await apiFetch(`/api/materiales/costo?materialId=${material.id}`)
            if (costRes.ok) {
              const costJson = await costRes.json()
              costoValue = Number(costJson.costo ?? 0).toFixed(2)
            }
          } catch { /* swallow */ }
        } else {
          // Ingreso: use Excel's costo_promedio if operation allows cost
          if (selectedTipo?.permite_precio_costo && row.costo_promedio !== undefined) {
            costoValue = Number(row.costo_promedio).toFixed(2)
          }
        }

        // Build distributions
        let distribuciones: Distribucion[]
        let stockRecords: any[] = []

        if (esSalida) {
          // Fetch stock records for this material
          try {
            const params = new URLSearchParams({
              summary: 'false',
              sucursalId: String(sucursalId),
              almacenId: '1',
              estadoStockId: String(defaultEstadoId),
              materialId: String(material.id),
              pageSize: '1000',
            })
            const stockRes = await apiFetch(`/api/stock?${params}`)
            if (stockRes.ok) {
              const stockJson = await stockRes.json()
              const stockData = Array.isArray(stockJson) ? stockJson : (stockJson.data || [])
              stockRecords = stockData.filter((s: any) => Number(s.cantidad) > 0)
            }
          } catch { /* swallow */ }

          let remaining = row.cantidad
          distribuciones = []

          for (const stock of stockRecords) {
            const take = Math.min(remaining, Number(stock.cantidad))
            if (take <= 0) continue
            remaining -= take
            distribuciones.push({
              id: Math.random().toString(36).substring(2, 11),
              ubicacion_id: stock.ubicacion_id,
              cantidad: take,
              numero_lote: stock.numero_lote || '---',
              fecha_expiracion: undefined,
            })
          }

          if (distribuciones.length === 0) {
            // No stock found — create placeholder so user can assign manually
            distribuciones.push({
              id: Math.random().toString(36).substring(2, 11),
              ubicacion_id: material.ubicacion_default_id || 0,
              cantidad: 0,
              numero_lote: '---',
            })
          }

          if (remaining > 0) {
            stockInsuficiente = true
          }
        } else {
          // Ingreso: single distribution from material defaults
          distribuciones = [{
            id: Math.random().toString(36).substring(2, 11),
            ubicacion_id: material.ubicacion_default_id || 0,
            cantidad: row.cantidad,
            numero_lote: (estaIngreso && material.stock_lote) ? '' : '---',
            fecha_expiracion: (estaIngreso && material.perecible) ? '' : undefined,
          }]
        }

        const presentaciones = presentacionesMap.get(material.id) || []
        const unidadMultiplo = unidadMultiploMap.get(material.id) || 1

        nuevasLineas.push({
          id: Math.random().toString(36).substring(2, 11),
          material_id: material.id,
          material_codigo: material.codigo,
          material_descripcion: material.descripcion,
          um: material.unidad_medida_rel?.descripcion || material.unidad_medida || 'UND',
          unidad_medida_id: material.unidad_medida_rel?.id || material.unidad_medida_id,
          unidad_medida_control_id: material.unidad_medida_rel?.id || material.unidad_medida_id,
          lote: (estaIngreso && material.stock_lote) ? '' : '',
          vencimiento: '',
          cantidad: row.cantidad,
          valor: costoValue,
          moneda: 'PEN',
          almacen_id: 1,
          estado_stock_id: defaultEstadoId,
          stock_lote: material.stock_lote,
          esquema_id: material.esquema_id,
          ubicacion_default_id: material.ubicacion_default_id,
          perecible: material.perecible,
          stock_actual: stockActualMap.get(material.id) ?? null,
          distribuciones,
          expandido: false,
          presentaciones,
          unidad_multiplo: unidadMultiplo,
          ubicaciones_disponibles: esSalida
            ? ubicaciones.filter(u => stockRecords.some((s: any) => s.ubicacion_id === u.id))
            : undefined,
        })
      }

      setLineas(prev => [...prev, ...nuevasLineas])
      let msg = `Se importaron ${nuevasLineas.length} línea(s) correctamente.`
      if (stockInsuficiente) {
        msg += ' Algunos materiales tienen stock insuficiente para cubrir la cantidad solicitada.'
      }
      toast.success(msg)
    } catch (err: any) {
      toast.error(`Error al procesar el archivo: ${err.message}`)
    } finally {
      if (e.target) e.target.value = ''
    }
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
          unidad_medida_id: l.unidad_medida_id,
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
              <div className="w-full px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[13px] font-medium">
                {sucursales.find(s => s.id === sucursalId)?.descripcion || 'Cargando...'}
              </div>
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

          {/* Lines Table Section - Transparent Layout */}
          <div className="flex flex-col flex-1">
            <div className="pb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] leading-none mb-1">Materiales Seleccionados</h3>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Registre los materiales y productos para este movimiento.</p>
              </div>
               <button type="button" onClick={() => fileInputRef.current?.click()}
                 className="px-6 h-11 rounded-2xl bg-emerald-600 text-white font-black text-[11px] hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 uppercase tracking-widest">
                 <span className="material-symbols-outlined text-[20px]">file_upload</span>
                 Importar
               </button>
               <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
               <button type="button" onClick={addLinea}
                 className="px-6 h-11 rounded-2xl bg-slate-800 text-white font-black text-[11px] hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg shadow-slate-800/20 uppercase tracking-widest">
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
                      <div className={cn("grid gap-2", selectedTipo?.requiere_suc_destino ? "col-span-3 grid-cols-3" : "col-span-6 grid-cols-5")}>
                        <div className="space-y-0">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linea.cantidad}
                             onBlur={e => {
                               // Parse final value and redistribute proportionally in base units
                               const totalNuevo = isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)
                               setLineas(prev => {
                                 const updated = [...prev]
                                 const multiplo = updated[index].unidad_multiplo || 1
                                 const baseTotal = totalNuevo * multiplo
                                 const nuevosDists = distribuirProporcional(updated[index].distribuciones, baseTotal)
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
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Und. Medida</label>
                          <select value={linea.unidad_medida_id || ''} onChange={e => handleLineaChange(index, 'unidad_medida_id', Number(e.target.value) || null)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-1 rounded-xl text-[9px] font-bold outline-none transition-all focus:border-blue-500">
                            <option value="">- PRESENTACIÓN -</option>
                            {linea.presentaciones.map(pres => (
                              <option key={pres.id} value={pres.unidad_medida_id}>
                                {pres.unidad_medida?.descripcion || `UM ${pres.unidad_medida_id}`}
                              </option>
                            ))}
                          </select>
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
                                  {(selectedTipo?.signo_origen === '-' ? (linea.ubicaciones_disponibles || []) : ubicaciones).map(u => <option key={u.id} value={u.id}>[{u.codigo}] {u.descripcion}</option>)}
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
                                     const multiplo = linea.unidad_multiplo || 1
                                     const baseTotal = (parseFloat(String(linea.cantidad)) || 0) * multiplo
                                     // Sum all OTHER distributions (in base)
                                     const sumOtros = linea.distribuciones.reduce((s, d, i) =>
                                       i === dIdx ? s : s + (parseFloat(String(d.cantidad)) || 0), 0)
                                     // Cap so total base doesn't exceed baseTotal
                                     const maxPermitido = Math.max(0, baseTotal - sumOtros)
                                     const newDists = [...linea.distribuciones]
                                     newDists[dIdx] = { ...newDists[dIdx], cantidad: Math.min(raw, maxPermitido) }
                                     handleLineaChange(index, 'distribuciones', newDists)
                                   }}
                                   onChange={e => {
                                     const v = e.target.value
                                     if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                                       const newDists = [...linea.distribuciones];
                                       newDists[dIdx].cantidad = parseFloat(v.replace(',', '.')) || 0;
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
                             const multiplo = linea.unidad_multiplo || 1
                             const baseTotal = (parseFloat(String(linea.cantidad)) || 0) * multiplo
                             const nuevaCantidad = isFirst
                               ? baseTotal
                               : Math.max(0, baseTotal - sumExistente)
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
