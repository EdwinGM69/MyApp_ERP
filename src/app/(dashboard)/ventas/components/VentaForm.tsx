'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Calculator, ShoppingCart, Trash2, CheckCircle2, ArrowLeft, BarChart2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MaterialSelect from '@/components/ui/MaterialSelect'
import DocumentoIdentificacionSelect from '@/components/ui/DocumentoIdentificacionSelect'

import ClasePedidoSelect from '@/components/ui/ClasePedidoSelect'
import AlmacenSelect from '@/components/ui/AlmacenSelect'
import UnidadSelect from '@/components/ui/UnidadSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import Topbar from '@/components/layout/Topbar'
import { getAuthStore } from '@/hooks/useAuth'
import { useSucursal } from '@/contexts/SucursalContext'
import { clonePageVaryPathWithNewSearchParams } from 'next/dist/client/components/segment-cache/vary-path'

interface EsquemaCalculoPaso {
  id: number
  esquema_id: number
  secuencia_paso: number
  descripcion_corta: string
  formula: string
  tipo: string
  condicion_id: number | null
}

interface VentaDetalleCondicion {
  condicion_id: number | null
  esquema_id: number | null
  valor: number
  codigo?: string
  descripcion?: string
  valor_original?: number
  es_porcentaje?: boolean
}

interface VentaDetalle {
  id: string
  material_id: number
  material_codigo: string
  material_descripcion: string
  almacen_id: number
  almacen_descripcion: string
  unidad_medida_id: number
  unidad_medida_stock_id: number // unidad del material para stock
  um: string
  um_stock: string // abreviatura de la unidad de medida del material para stock
  unidad_multiplo: number // multiplicador de la unidad de medida (para calculos en esquema)
  cantidad: number
  precio_unit: number
  descuento: number
  descuento_cupon: number
  descuento_cupon_unitario?: number
  descuento_promocion: number
  impuesto: number
  subtotal: number
  stock: number | null
  pasos_calculados?: VentaDetalleCondicion[]
  // Promotion fields
  promocion_id?: number | null
  promocion_label?: string | null // promotion name
  promocion_badge?: string | null // e.g. "3x1"
  promocion_cantidad_compra?: number | null
  promocion_cantidad_regalo?: number | null
  cantidad_total_grupo?: number | null // total qty of all items in promo group
  promo_aplicada?: boolean // true if this line gets the promo discount
  categoria_id?: number | null // stored to check category promos
  aplica_cupon?: boolean // indicates if coupon applies to this line
  cupon_codigo?: string | null // coupon code
  cupon_descuento?: number | null // coupon discount percentage or value
}

export default function VentaForm() {
  const router = useRouter()
  const { currentSucursal } = useSucursal()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // UI State for expansion
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  // Moneda and Formatting
  const [monedaId, setMonedaId] = useState<number | null>(null)
  const [monedaSimbolo, setMonedaSimbolo] = useState('$')

  // Header state
  const [comprobante, setComprobante] = useState('')
  const [fechaVenta, setFechaVenta] = useState('')
  useEffect(() => {
    setMounted(true)
    setFechaVenta(new Date().toISOString().split('T')[0])

    // Set default currency from user if available
    const user = getAuthStore().user
    if (user?.monedaId) setMonedaId(user.monedaId)
    if (user?.monedaSimbolo) setMonedaSimbolo(user.monedaSimbolo)

    // Set sucursal from context
    if (currentSucursal) {
      setSucursal({ id: currentSucursal.id, descripcion: currentSucursal.descripcion })
    }

    // Load active coupons on mount
    fetchCuponesActivos()
  }, [currentSucursal])

  const [cliente, setCliente] = useState<{ id: number; nombre: string } | null>(null)
  const [docIdentificacion, setDocIdentificacion] = useState<{ id: number; abreviatura: string } | null>(null)
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('')
  const [nombre, setNombre] = useState('')
  const [nombresCompletos, setNombresCompletos] = useState('')
  const [apellidosCompletos, setApellidosCompletos] = useState('')
  const [direccion, setDireccion] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [provincia, setProvincia] = useState('')
  const [distrito, setDistrito] = useState('')

  const [mediosPagoOptions, setMediosPagoOptions] = useState<any[]>([])
  const [mediosPagoSeleccionados, setMediosPagoSeleccionados] = useState<Record<number, { selected: boolean, importe: string }>>({})

  const [expandedCards, setExpandedCards] = useState({
    generales: false,
    cliente: false,
    pagos: false,
    otros: false
  })

  useEffect(() => {
    const fetchMediosPago = async () => {
      try {
        const res = await apiFetch('/api/tesoreria/medios-pago?pageSize=100')
        if (res.ok) {
          const json = await res.json()
          if (json.data) setMediosPagoOptions(json.data)
        }
      } catch (err) {
        console.error('Error fetching medios pago:', err)
      }
    }
    fetchMediosPago()
  }, [])

  const [sucursal, setSucursal] = useState<{ id: number; descripcion: string } | null>(null)
  const [clasePedido, setClasePedido] = useState<{
    id: number;
    descripcion: string;
    estado_stock_id?: number;
    registro_caja?: boolean;
    concepto_caja_id?: number;
  } | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [pasosEsquema, setPasosEsquema] = useState<EsquemaCalculoPaso[]>([])
  const [variablesEsquema, setVariablesEsquema] = useState<any[]>([])

  // Fetch esquema steps when clasePedido changes
  useEffect(() => {
    if (clasePedido?.id) {
      // First get clase pedido detail to get esquema_id if not present
      const fetchEsquema = async () => {
        try {
          const cpRes = await apiFetch(`/api/comercial/clases-pedido?id=${clasePedido.id}`)
          const cpJson = await cpRes.json()
          const cp = Array.isArray(cpJson.data) ? cpJson.data.find((x: any) => x.id === clasePedido.id) : cpJson.data

          if (cp?.esquema_id) {
            const esRes = await apiFetch(`/api/esquemas-calculo?id=${cp.esquema_id}`)
            const esJson = await esRes.json()
            if (esJson.data?.pasos) {
              const sortedPasos = esJson.data.pasos.sort((a: any, b: any) => a.secuencia_paso - b.secuencia_paso)
              setPasosEsquema(sortedPasos)

              // Recalculate all lines with new schema
              lineas.forEach((l, idx) => {
                if (l.material_id) {
                  // We use the local sortedPasos to avoid waiting for state update
                  calculateLineCalculations(idx, l.material_id, l.cantidad, l, sortedPasos, esJson.data.variables || [], cuponAplicadoGlobal)
                }
              })
            }
            if (esJson.data?.variables) {
              setVariablesEsquema(esJson.data.variables)
            }
          }
        } catch (error) {
          console.error('Error fetching esquema:', error)
        }
      }
      fetchEsquema()
    }
  }, [clasePedido?.id])

  // Lines state
  const [lineas, setLineas] = useState<VentaDetalle[]>([])

  // Cupon state
  const [cuponesActivos, setCuponesActivos] = useState<any[]>([])
  const [showCuponSelector, setShowCuponSelector] = useState<Record<string, boolean>>({})
  const [cuponSeleccionado, setCuponSeleccionado] = useState<Record<string, any>>({})
  const [cuponAplicadoGlobal, setCuponAplicadoGlobal] = useState<any>(null)
  const [materialesConCupon, setMaterialesConCupon] = useState<Record<string, boolean>>({})

  // Totals calculation (Keep for UI display)
  const totals = useMemo(() => {
    const subtotal = lineas.reduce((acc, l) => acc + (l.precio_unit * l.cantidad * (l.unidad_multiplo || 1)), 0)
    const descuento = lineas.reduce((acc, l) => acc + (l.descuento || 0), 0)
    const descuento_cupon = lineas.reduce((acc, l) => acc + (l.descuento_cupon || 0), 0)
    const descuento_promocion = lineas.reduce((acc, l) => acc + (l.descuento_promocion || 0), 0)
    const impuesto = lineas.reduce((acc, l) => acc + (l.impuesto || 0), 0)
    const total = lineas.reduce((acc, l) => acc + (l.subtotal || 0), 0)
    return { subtotal, descuento, descuento_cupon, descuento_promocion, impuesto, total }
  }, [lineas])

  const addLinea = () => {
    const id = Math.random().toString(36).substring(2, 11)
    const newLinea: VentaDetalle = {
      id,
      material_id: 0,
      material_codigo: '',
      material_descripcion: '',
      almacen_id: 0,
      almacen_descripcion: '',
      unidad_medida_id: 0,
      unidad_medida_stock_id: 0,
      um: 'UND',
      um_stock: 'UND',
      unidad_multiplo: 1,
      cantidad: 1,
      precio_unit: 0,
      descuento: 0,
      descuento_cupon: 0,
      descuento_cupon_unitario: 0,
      descuento_promocion: 0,
      impuesto: 0,
      subtotal: 0,
      stock: null,
      aplica_cupon: false
    }
    setLineas([...lineas, newLinea])
    // NOTE: New lines start collapsed (breakdown shown only on demand)
  }

  const removeLinea = (index: number) => {
    const lineId = lineas[index].id
    const hasOtherMaterials = lineas.some((l, i) => i !== index && l.material_id)

    setLineas(lineas.filter((_, i) => i !== index))
    setExpandedLines(prev => {
      const next = new Set(prev)
      next.delete(lineId)
      return next
    })
    setShowCuponSelector(prev => {
      const next = { ...prev }
      delete next[lineId]
      return next
    })
    setCuponSeleccionado(prev => {
      const next = { ...prev }
      delete next[lineId]
      return next
    })

    // Remove coupon when last material is removed
    if (!hasOtherMaterials && cuponAplicadoGlobal) {
      eliminarCuponGlobal()
    }

    // Recalculate promotions for remaining lines
    setTimeout(() => {
      const remainingLineas = lineas.filter((_, i) => i !== index)
      if (remainingLineas.length > 0) {
        remainingLineas.forEach((l, i) => {
          if (l.material_id && pasosEsquema.length > 0) {
            checkPromocion(i, l.material_id, l.categoria_id, l, remainingLineas)
          }
        })
      }
    }, 50)
  }

  const fetchCuponesActivos = async () => {
    if (cuponesActivos.length > 0) return
    try {
      const res = await apiFetch('/api/precios/cupones?pageSize=100')
      if (res.ok) {
        const json = await res.json()
        console.log('Cupones API response:', json)
        const hoy = new Date(fechaVenta || new Date())
        const filtrados = (json.data || []).filter((c: any) =>
          c.activo &&
          new Date(c.fecha_inicio) <= hoy &&
          new Date(c.fecha_fin) >= hoy
        )
        console.log('Cupones filtrados:', filtrados)
        setCuponesActivos(filtrados)
      }
    } catch (err) {
      console.error('Error fetching cupones:', err)
    }
  }

  const toggleCuponSelector = async (lineId: string) => {
    const newState = !showCuponSelector[lineId]
    setShowCuponSelector(prev => ({ ...prev, [lineId]: newState }))
    if (newState) {
      await fetchCuponesActivos()
      if (!expandedLines.has(lineId)) {
        toggleLineExpansion(lineId)
      }
    }
  }

  const aplicarCuponGlobal = async (cupon: any) => {
    // Fetch cupon details and categories
    try {
      const [detallesRes, categoriasRes] = await Promise.all([
        apiFetch(`/api/precios/cupones/${cupon.id}/detalles`),
        apiFetch(`/api/precios/cupones/${cupon.id}/categorias`)
      ])

      const detallesJson = await detallesRes.json()
      const categoriasJson = await categoriasRes.json()

      const cuponDetalles = detallesJson.data || []
      const cuponCategorias = categoriasJson.data || []

      // Get IDs that apply
      const materialIdsAplica = new Set(cuponDetalles.map((d: any) => d.material_id))
      const categoriaIdsAplica = new Set(cuponCategorias.map((c: any) => c.categoria_id))

      // No restrictions = applies to all materials
      const sinRestricciones = cuponDetalles.length === 0 && cuponCategorias.length === 0

      // Find lines where material applies
      const qualifyingLines: Array<{ id: string, linea: typeof lineas[0], unitario: number, total: number }> = []
      lineas.forEach((linea) => {
        if (!linea.material_id) return

        // Check if material ID is in details
        const materialMatch = materialIdsAplica.has(linea.material_id)
        // Check if material category is in categories
        const categoryMatch = linea.categoria_id && categoriaIdsAplica.has(linea.categoria_id)

        if (sinRestricciones || materialMatch || categoryMatch) {
          // Calculate unit and total values
          const cuponValorUnitario = cupon.tipo === 'PORCENTAJE'
            ? linea.precio_unit * (cupon.valor / 100)
            : cupon.valor
          const cuponValorTotal = cuponValorUnitario * linea.cantidad
          qualifyingLines.push({ id: linea.id, linea, unitario: cuponValorUnitario, total: cuponValorTotal })
        }
      })

      if (qualifyingLines.length === 0) {
        toast.error('El cupón no puede aplicarse a ningún material en el detalle')
        return
      }

      // Calculate total discount
      const totalCuponDescuento = qualifyingLines.reduce((sum, q) => sum + q.total, 0)

      // Apply to the line with the highest quantity among qualifying
      qualifyingLines.sort((a, b) => b.linea.cantidad - a.linea.cantidad)
      const chosen = qualifyingLines[0]
      const chosenUnitario = totalCuponDescuento / chosen.linea.cantidad

      const updatedLineas = lineas.map((linea) => {
        if (linea.id === chosen.id) {
          return {
            ...linea,
            descuento_cupon_unitario: chosenUnitario,
            descuento_cupon: totalCuponDescuento,
            aplica_cupon: true,
            cupon_codigo: cupon.nombre || cupon.codigo,
            cupon_descuento: cupon.tipo === 'PORCENTAJE' ? cupon.valor : cupon.valor
          }
        } else {
          return {
            ...linea,
            descuento_cupon_unitario: 0,
            descuento_cupon: 0,
            aplica_cupon: qualifyingLines.some(q => q.id === linea.id),
            cupon_codigo: null,
            cupon_descuento: null
          }
        }
      })

      // Update state
      setCuponAplicadoGlobal(cupon)
      setMaterialesConCupon({ [chosen.id]: true })
      setLineas(updatedLineas)

      // Recalculate all lines
      updatedLineas.forEach((linea, index) => {
        if (linea.material_id && linea.pasos_calculados) {
          calculateLineCalculations(index, linea.material_id, linea.cantidad, linea, undefined, undefined, cupon)
        }
      })

      toast.success(`Cupón "${cupon.nombre}" aplicado a ${materialIdsAplica.size} producto(s)`)
    } catch (err) {
      console.error('Error applying coupon:', err)
      toast.error('Error al aplicar el cupón')
    }
  }

  const eliminarCuponGlobal = () => {
    const cupon = cuponAplicadoGlobal
    if (cupon) {
      setCuponAplicadoGlobal(null)
      setMaterialesConCupon({})

      const updatedLineas = lineas.map((linea) => ({
        ...linea,
        descuento_cupon: 0,
        descuento_cupon_unitario: 0,
        aplica_cupon: false,
        cupon_codigo: null,
        cupon_descuento: null
      }))
      setLineas(updatedLineas)

      // Recalculate all lines to update schema
      updatedLineas.forEach((linea, index) => {
        if (linea.material_id && linea.pasos_calculados) {
          calculateLineCalculations(index, linea.material_id, linea.cantidad, linea)
        }
      })

      toast.success('Cupón eliminado')
    }
  }

  const checkMaterialQualifiesForCupon = async (
    cupon: any,
    materialId: number,
    categoriaId: number | null | undefined
  ): Promise<boolean> => {
    try {
      const [detallesRes, categoriasRes] = await Promise.all([
        apiFetch(`/api/precios/cupones/${cupon.id}/detalles`),
        apiFetch(`/api/precios/cupones/${cupon.id}/categorias`)
      ])

      const detallesJson = await detallesRes.json()
      const categoriasJson = await categoriasRes.json()

      const cuponDetalles = detallesJson.data || []
      const cuponCategorias = categoriasJson.data || []

      const materialIdsAplica = new Set(cuponDetalles.map((d: any) => d.material_id))
      const categoriaIdsAplica = new Set(cuponCategorias.map((c: any) => c.categoria_id))

      const sinRestricciones = cuponDetalles.length === 0 && cuponCategorias.length === 0

      const materialMatch = materialIdsAplica.has(materialId)
      const categoryMatch = categoriaId !== null && categoriaId !== undefined && categoriaIdsAplica.has(categoriaId)

      return sinRestricciones || materialMatch || categoryMatch
    } catch (err) {
      console.error('Error checking coupon qualification:', err)
      return false
    }
  }

  const toggleLineExpansion = (lineId: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return next
    })
  }

  const fetchStock = async (lineIndex: number, materialId: number, almacenId: number, sucursalId: number, umId: number, estadoStockId?: number) => {
    if (!materialId || !almacenId || !sucursalId || !umId || !estadoStockId) return

    try {
      const res = await apiFetch(`/api/stock?summary=true&materialId=${materialId}&almacenId=${almacenId}&sucursalId=${sucursalId}&unidadMedidaId=${umId}&estadoStockId=${estadoStockId}`)
      const json = await res.json()
      const newStock = json.total ?? 0

      setLineas(prev => {
        const next = [...prev]
        if (next[lineIndex]) {
          next[lineIndex].stock = newStock
        }
        return next
      })
    } catch (error) {
      console.error('Error fetching stock:', error)
    }
  }

  const calculateLineCalculations = async (
    index: number,
    materialId: number,
    cantidad: number,
    lineaData: Partial<VentaDetalle> = {},
    overridePasos?: EsquemaCalculoPaso[],
    overrideVariables?: any[],
    globalCupon?: any
  ) => {
    const activePasos = overridePasos || pasosEsquema
    const activeVariables = overrideVariables || variablesEsquema

    // Convert cantidad using unidad_multiplo for scheme calculations (internal use only)
    const unidadMultiplo = lineaData.unidad_multiplo || 1
    const cantidadConvertida = cantidad * unidadMultiplo

    // Promotion data from line
    const promocionId = lineaData?.promocion_id
    const promocionCantidadCompra = lineaData?.promocion_cantidad_compra
    const promocionCantidadRegalo = lineaData?.promocion_cantidad_regalo
    const cantidadTotalGrupo = lineaData?.cantidad_total_grupo || null
    const promoAplicada = lineaData?.promo_aplicada || false

    // Coupon data from line - use the total value directly
    const descuentoCuponUnitario = lineaData?.descuento_cupon_unitario || 0
    const descuentoCupon = lineaData?.descuento_cupon || 0

    if (!materialId || activePasos.length === 0) return

    try {
      console.log('DEBUG: Starting calculation for line', index, 'Material:', materialId, 'Qty:', cantidad)

      // Use the document date for condition filtering
      const dateForFiltering = new Date(fechaVenta || new Date())
      console.log('DEBUG: Filtering with date:', dateForFiltering.toISOString())

      const [resSpecific, resGeneral] = await Promise.all([
        apiFetch(`/api/comercial/condiciones?material_id=${materialId}`),
        apiFetch(`/api/comercial/condiciones?material_id=null`)
      ])

      const jsonSpecific = await resSpecific.json()
      const jsonGeneral = await resGeneral.json()

      const rawCondiciones: any[] = [...(jsonSpecific.data || []), ...(jsonGeneral.data || [])]

      console.log('DEBUG: Raw conditions from API:', rawCondiciones.length)
      console.log("Condiciones:", rawCondiciones)

      const todasCondiciones: any[] = rawCondiciones.filter((c: any) =>
        c.activo &&
        (!monedaId || c.moneda_id === monedaId) &&
        new Date(c.fecha_desde) <= dateForFiltering &&
        (!c.fecha_hasta || new Date(c.fecha_hasta) >= dateForFiltering)
      )
      console.log('DEBUG: Active conditions after filtering:', todasCondiciones.length)
      console.log('DEBUG: Active conditions details:', todasCondiciones.map(c => ({ id: c.id, tipo_condicion_id: c.tipo_condicion_id, valor: c.valor, porcentaje: c.porcentaje, material_id: c.material_id })))
      if (todasCondiciones.length === 0) {
        console.warn('DEBUG: No active conditions found for material', materialId, 'and date', dateForFiltering)
      }

      let precioUnitBase = lineaData?.precio_unit || 0 // Use current price as base, overridden by Precio steps
      let subtotalBruto = cantidadConvertida * precioUnitBase // Default subtotal (using converted qty)
      let totalImpuesto = 0
      let totalDescuento = 0
      let descuentosUnitarios = 0
      let descuentoPromocion = 0
      let descuentoCupon = 0
      let descuentoCuponUnitarioAcumulado = lineaData?.descuento_cupon_unitario || 0

      console.log('DEBUG: Initial calculation values:')
      console.log('  precioUnitBase:', precioUnitBase)
      console.log('  cantidad:', cantidad, '-> convertida:', cantidadConvertida)
      console.log('  initial subtotalBruto:', subtotalBruto)
      console.log('  lineaData:', {
        promocion_id: lineaData?.promocion_id,
        promocion_cantidad_compra: lineaData?.promocion_cantidad_compra,
        promocion_cantidad_regalo: lineaData?.promocion_cantidad_regalo,
        descuento_cupon: lineaData?.descuento_cupon
      })

      const results: Record<string, number> = {}
      const varContext: Record<string, number> = {}

      activeVariables.forEach(v => {
        if (v.variable_id) {
          const val = typeof v.valor === 'number' ? v.valor : parseFloat(v.valor || '0')
          varContext[v.variable_id.toLowerCase().trim()] = isNaN(val) ? 0 : val
        }
      })
      console.log('DEBUG: Variable context:', varContext)

      // Separate tax and non-tax steps to ensure discounts are applied before tax calculation
      const taxPasos = activePasos.filter(p => p.tipo === 'Impuesto')
      const nonTaxPasos = activePasos.filter(p => p.tipo !== 'Impuesto')

      console.log('DEBUG: Starting calculation with', activePasos.length, 'total steps:', activePasos.map(p => `${p.tipo}: ${p.descripcion_corta}`))
      console.log('DEBUG: Tax steps:', taxPasos.length, 'Non-tax steps:', nonTaxPasos.length)
      console.log('DEBUG: Initial values - precioUnitBase:', precioUnitBase, 'subtotalBruto:', subtotalBruto, 'cantidad:', cantidad, '-> convertida:', cantidadConvertida)

      // Process non-tax steps first
      const nonTaxCalculados: VentaDetalleCondicion[] = nonTaxPasos.map(paso => {
        let valorBase = 0
        let esporcentaje = false

        // 1. Get value from model "Condiciones" if step has a condicion_id
        console.log(`DEBUG: Processing step "${paso.descripcion_corta}" (Type: ${paso.tipo}, CondID: ${paso.condicion_id}, Formula: ${paso.formula})`)
        console.log(`DEBUG: Step context - subtotalBruto: ${subtotalBruto}, precioUnitBase: ${precioUnitBase}, descuentosUnitarios: ${descuentosUnitarios}`)

        let condicionEncontrada = false

        if (paso.condicion_id) {
          console.log(`DEBUG: Step "${paso.descripcion_corta}" searching for Condicion ID: ${paso.condicion_id}`)

          const condicionEspecifica = todasCondiciones.find((c: any) =>
            Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
            Number(c.material_id) === Number(materialId)
          )
          const condicionGeneral = todasCondiciones.find((c: any) =>
            Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
            (c.material_id === null || c.material_id === undefined)
          )

          const condicion = condicionEspecifica || condicionGeneral
          if (condicion) {
            condicionEncontrada = true
            valorBase = parseFloat(condicion.valor) || 0
            esporcentaje = condicion.porcentaje === true
            console.log(`DEBUG: Step "${paso.descripcion_corta}" found match. ID: ${condicion.id}, Value: ${valorBase}, %: ${esporcentaje}`)
          } else {
            // For coupon steps, check if there's a global coupon applied
            const isCuponStep = paso.descripcion_corta.toLowerCase().includes('cupon') || paso.descripcion_corta.toLowerCase().includes('cupón')
            if (isCuponStep && globalCupon) {
              condicionEncontrada = true
              valorBase = globalCupon.valor
              esporcentaje = globalCupon.tipo === 'PORCENTAJE'
              console.log(`DEBUG: Step "${paso.descripcion_corta}" using global coupon. Value: ${valorBase}, %: ${esporcentaje}`)
            } else {
              console.warn(`DEBUG: Step "${paso.descripcion_corta}" (CondId: ${paso.condicion_id}) NO found in ${todasCondiciones.length} active conditions.`)
              console.log('DEBUG: Active Cond IDs available:', todasCondiciones.map(c => c.tipo_condicion_id))

              valorBase = 0
              esporcentaje = true
            }
          }
        } else {
          // Si no tiene condicion_id pero es de tipo Impuesto, aplicar IGV por defecto
          if (paso.tipo === 'Impuesto') {
            console.log('DEBUG: Step "Impuesto" without condicion_id - applying default 18%')
            valorBase = 0
            esporcentaje = true
          }
        }

        // 2. Evaluate formula and determine final value
        let valorFinal = 0
        try {
          let formula = (paso.formula || '1').toLowerCase().trim()
          const originalFormula = formula

          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)

          // 2.1 Combine variable context with dynamic line data
          // This ensures that line-specific values (like real quantity) take precedence
          const stepSlug = paso.descripcion_corta.toLowerCase().trim().replace(/\s+/g, '_')
          const stepName = paso.descripcion_corta.toLowerCase().trim()

          // Create context WITHOUT spreading varContext directly, filter out stepSlug and step name from varContext
          const filteredVarContext: Record<string, number> = {}
          Object.keys(varContext).forEach(k => {
            const stepSlugLower = stepSlug.toLowerCase()
            const stepNameLower = stepName.toLowerCase()
            const stepNameUnderscore = stepNameLower.replace(/\s+/g, '_')
            // Also filter if varContext key is contained in step name (e.g., "descuento" in "valor_descuento")
            const keyContained = stepSlugLower.includes(k) || stepNameLower.includes(k)
            if (!keyContained) {
              filteredVarContext[k] = varContext[k]
            }
          })

          const evalContext: Record<string, number> = {
            ...filteredVarContext,
            cantidad: cantidadConvertida,
            precio_unit: precioUnitBase,
            subtotal: baseCalculo,
            valor_condicion: valorBase,
            precio: valorBase,
            [stepSlug]: valorBase,
            // Also add alias without prefix (e.g., "valor_descuento" -> also add "descuento")
            ...(stepSlug.includes('_') ? { [stepSlug.split('_').pop()!]: valorBase } : {})
          }

          console.log(`DEBUG: Step "${paso.descripcion_corta}" - stepSlug: ${stepSlug}, valorBase: ${valorBase}, filter keys: ${Object.keys(filteredVarContext).join(', ')}`)

          // 2.2 Replace step references (s1, s2, etc.)
          formula = formula.replace(/\bs([0-9]+)\b/g, (match, num) => {
            return (results[num] || 0).toString()
          })

          // 2.3 Replace all variables from context using word boundaries to prevent logic errors
          // We sort keys by length descending to prevent replacing "subtotal" inside "super_subtotal" if applicable
          Object.keys(evalContext)
            .sort((a, b) => b.length - a.length)
            .forEach(vName => {
              const regex = new RegExp(`\\b${vName}\\b`, 'gi')
              formula = formula.replace(regex, evalContext[vName].toString())
            })

          console.log(`DEBUG: Step "${paso.descripcion_corta}" - Formula after replace: "${formula}", valorBase: ${valorBase}`)

          // If required condition not found, set valorFinal to 0 and skip formula evaluation
          if (paso.condicion_id && !condicionEncontrada) {
            console.log(`DEBUG: Step "${paso.descripcion_corta}" - Required condition not found, using 0`)
            valorFinal = 0
          } else if (formula === '1' || formula === '') {
            if (esporcentaje) {
              valorFinal = baseCalculo * (valorBase / 100)
            } else {
              valorFinal = valorBase
            }
          } else {
            // eslint-disable-next-line no-eval
            valorFinal = eval(formula) || 0
            console.log(`DEBUG: Step "${paso.descripcion_corta}" Formula: ${originalFormula} -> ${formula} = ${valorFinal}`)
          }
        } catch (e) {
          console.error('DEBUG: Error evaluating formula for step:', paso.descripcion_corta, paso.formula, e)
          valorFinal = 0
        }

        // 3. Update running totals for context
        if (paso.tipo === 'Precio') {
          const formulaString = (paso.formula || '').toLowerCase()
          const isMultipliedByQty = formulaString.includes('cantidad')

          if (isMultipliedByQty && cantidadConvertida > 0) {
            precioUnitBase = valorFinal / cantidadConvertida
            subtotalBruto = valorFinal
          } else {
            precioUnitBase = valorFinal
            subtotalBruto = cantidadConvertida * precioUnitBase
          }
          console.log(`DEBUG: Updated Price Base: ${precioUnitBase}, Subtotal: ${subtotalBruto}`)
        } else if (paso.tipo === 'Impuesto') {
          totalImpuesto += valorFinal
          console.log(`DEBUG: Updated Total Tax: ${totalImpuesto}`)
        } else if (paso.tipo === 'Subtotal') {
          subtotalBruto = valorFinal // Running total for next steps
          console.log(`DEBUG: Updated Running Subtotal: ${subtotalBruto}`)
        } else if (paso.tipo === 'Descuento') {
          const descripcionLower = paso.descripcion_corta.toLowerCase()

          // Check if this is a promotion discount
          const isPromocion = descripcionLower.includes('promocion') || descripcionLower.includes('promoción')
          const isCupon = descripcionLower.includes('cupon') || descripcionLower.includes('cupón')
          console.log(`DEBUG: Step "${paso.descripcion_corta}" - descripcionLower: "${descripcionLower}", isPromocion: ${isPromocion}, isCupon: ${isCupon}`)
          if (isPromocion) {
            // Promotion step: ONLY apply if this line is the chosen one (promo_aplicada = true)
            const qtyForPromo = cantidadTotalGrupo || cantidadConvertida
            console.log(`DEBUG: Promotion Step - promocionId: ${promocionId}, promocionCantidadCompra: ${promocionCantidadCompra}, promocionCantidadRegalo: ${promocionCantidadRegalo}, cantidad: ${cantidad} -> convertida: ${cantidadConvertida}, totalGrupo: ${cantidadTotalGrupo}, promoAplicada: ${promoAplicada}`)
            console.log(`DEBUG: Promotion data from lineaData:`, {
              promocion_id: lineaData?.promocion_id,
              promocion_cantidad_compra: lineaData?.promocion_cantidad_compra,
              promocion_cantidad_regalo: lineaData?.promocion_cantidad_regalo,
              cantidad_total_grupo: cantidadTotalGrupo,
              promo_aplicada: promoAplicada
            })
            if (promoAplicada && promocionId && promocionCantidadCompra && promocionCantidadRegalo && qtyForPromo >= promocionCantidadCompra) {
              // Effective unit price after commercial AND coupon discounts
              const precioEfectivo = precioUnitBase - descuentosUnitarios - descuentoCuponUnitarioAcumulado
              // Number of free units (using TOTAL quantity from group)
              const unidadesGratisTotal = Math.floor(qtyForPromo / promocionCantidadCompra) * promocionCantidadRegalo
              // Apply full discount to this line (only one line in group has promo_aplicada = true)
              valorFinal = precioEfectivo * unidadesGratisTotal
              console.log(`DEBUG: Promotion Calculation (GROUPED) - qtyForPromo: ${qtyForPromo}, precioUnitBase: ${precioUnitBase}, descuentosUnitarios: ${descuentosUnitarios}, descuentoCuponUnitarioAcumulado: ${descuentoCuponUnitarioAcumulado}, precioEfectivo: ${precioEfectivo}, unidadesGratisTotal: ${unidadesGratisTotal}, valorFinal: ${valorFinal}`)
              console.log(`DEBUG: Before applying promotion - subtotalBruto: ${subtotalBruto}, descuentoPromocion: ${descuentoPromocion}, totalDescuento: ${totalDescuento}`)
              descuentoPromocion += valorFinal
              totalDescuento += valorFinal
              subtotalBruto = subtotalBruto - valorFinal
              console.log(`DEBUG: After applying promotion - subtotalBruto: ${subtotalBruto}, descuentoPromocion: ${descuentoPromocion}, totalDescuento: ${totalDescuento}`)
            } else {
              // This line is NOT the chosen one for promo discount
              valorFinal = 0
              console.log(`DEBUG: Promotion NOT applied to this line - promoAplicada: ${promoAplicada}, condition: promocionId=${!!promocionId}, compra=${promocionCantidadCompra}, regalo=${promocionCantidadRegalo}, cantidad=${qtyForPromo}`)
            }
            console.log(`DEBUG: Step Promocion: valorFinal=${valorFinal}, descuentoPromocion=${descuentoPromocion}, totalDescuento=${totalDescuento}`)
          }
          // Check if this is a coupon discount
          else if (isCupon) {
            // Only apply coupon if the line qualifies
            if (lineaData.aplica_cupon) {
              // Coupon step: Calculate based on condition (global coupon)
              if (condicionEncontrada && valorBase > 0) {
                const descuentoUnitario = esporcentaje
                  ? precioUnitBase * (valorBase / 100)
                  : valorBase
                descuentoCupon = descuentoUnitario * cantidadConvertida
                totalDescuento += descuentoCupon
                subtotalBruto -= descuentoCupon
                // Update accumulated coupon unit discount
                descuentoCuponUnitarioAcumulado = descuentoUnitario
                // Update the line's coupon data
                lineaData.descuento_cupon_unitario = descuentoUnitario
                lineaData.descuento_cupon = descuentoCupon
                valorFinal = descuentoCupon
                console.log(`DEBUG: Coupon Calculated - unitario: ${descuentoUnitario}, total: ${descuentoCupon}, subtotalBruto=${subtotalBruto}`)
              } else {
                // Fallback to pre-calculated if no condition
                console.log(`DEBUG: Coupon Step - using pre-calculated: descuentoCuponUnitario: ${descuentoCuponUnitario}, descuentoCupon: ${descuentoCupon}`)
                descuentoCupon = descuentoCuponUnitario * cantidadConvertida
                totalDescuento += descuentoCupon
                subtotalBruto -= descuentoCupon
                descuentoCuponUnitarioAcumulado = descuentoCuponUnitario
                valorFinal = descuentoCupon
              }
            } else {
              // Line does not qualify for coupon
              descuentoCuponUnitarioAcumulado = 0
              valorFinal = 0
              console.log(`DEBUG: Coupon not applied - line does not qualify`)
            }
            console.log(`DEBUG: Step Cupon: valorFinal=${valorFinal}, descuentoCupon=${descuentoCupon}, totalDescuento=${totalDescuento}`)
          }
          // Commercial discount
          else {
            totalDescuento += valorFinal
            if (cantidadConvertida > 0) {
              descuentosUnitarios += valorFinal / cantidadConvertida
            }
            subtotalBruto = subtotalBruto - valorFinal
            console.log(`DEBUG: Step Descuento (comercial): valorFinal=${valorFinal}, totalDescuento=${totalDescuento}, subtotalBruto=${subtotalBruto}`)
          }
        }

        // Store result for future steps (after all updates to valorFinal)
        results[paso.secuencia_paso.toString()] = valorFinal

        return {
          condicion_id: paso.condicion_id,
          esquema_id: paso.esquema_id,
          valor: valorFinal,
          codigo: paso.tipo,
          descripcion: paso.descripcion_corta,
          valor_original: paso.condicion_id && results[paso.secuencia_paso.toString()] !== undefined ? valorBase : undefined,
          es_porcentaje: esporcentaje
        }
      })

      console.log('DEBUG: After non-tax steps - subtotalBruto:', subtotalBruto, 'descuentoPromocion:', descuentoPromocion, 'descuentoCupon:', descuentoCupon, 'totalDescuento:', totalDescuento, 'totalImpuesto:', totalImpuesto)
      console.log('DEBUG: Non-tax pasosCalculados:', nonTaxCalculados.map(p => ({ desc: p.descripcion, valor: p.valor })))

      // Process tax steps after all discounts are applied
      const taxCalculados: VentaDetalleCondicion[] = taxPasos.map(paso => {
        let valorBase = 0
        let esporcentaje = false

        // 1. Get value from model "Condiciones" if step has a condicion_id
        console.log(`DEBUG: Processing tax step "${paso.descripcion_corta}" (Type: ${paso.tipo}, CondID: ${paso.condicion_id}, Formula: ${paso.formula})`)

        let condicionEncontrada = false

        if (paso.condicion_id) {
          console.log(`DEBUG: Tax step "${paso.descripcion_corta}" searching for Condicion ID: ${paso.condicion_id}`)

          const condicionEspecifica = todasCondiciones.find((c: any) =>
            Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
            Number(c.material_id) === Number(materialId)
          )
          const condicionGeneral = todasCondiciones.find((c: any) =>
            Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
            (c.material_id === null || c.material_id === undefined)
          )

          const condicion = condicionEspecifica || condicionGeneral
          if (condicion) {
            condicionEncontrada = true
            valorBase = parseFloat(condicion.valor) || 0
            esporcentaje = condicion.porcentaje === true
            console.log(`DEBUG: Tax step "${paso.descripcion_corta}" found match. ID: ${condicion.id}, Value: ${valorBase}, %: ${esporcentaje}`)
          } else {
            // For coupon steps, check if there's a global coupon applied
            const isCuponStep = paso.descripcion_corta.toLowerCase().includes('cupon') || paso.descripcion_corta.toLowerCase().includes('cupón')
            if (isCuponStep && globalCupon) {
              condicionEncontrada = true
              valorBase = globalCupon.valor
              esporcentaje = globalCupon.tipo === 'PORCENTAJE'
              console.log(`DEBUG: Tax step "${paso.descripcion_corta}" using global coupon. Value: ${valorBase}, %: ${esporcentaje}`)
            } else {
              console.warn(`DEBUG: Tax step "${paso.descripcion_corta}" (CondId: ${paso.condicion_id}) NO found in ${todasCondiciones.length} active conditions.`)
              console.log('DEBUG: Active Cond IDs available:', todasCondiciones.map(c => c.tipo_condicion_id))

              valorBase = 0
              esporcentaje = true
            }
          }
        } else {
          // Si no tiene condicion_id pero es de tipo Impuesto, aplicar IGV por defecto
          if (paso.tipo === 'Impuesto') {
            console.log('DEBUG: Tax step "Impuesto" without condicion_id - applying default 18%')
            valorBase = 0
            esporcentaje = true
          }
        }

        // 2. Evaluate formula and determine final value
        let valorFinal = 0
        try {
          let formula = (paso.formula || '1').toLowerCase().trim()
          const originalFormula = formula

          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)

          // 2.1 Combine variable context with dynamic line data
          const stepSlug = paso.descripcion_corta.toLowerCase().trim().replace(/\s+/g, '_')
          const stepName = paso.descripcion_corta.toLowerCase().trim()

          // Create context WITHOUT spreading varContext directly, filter out stepSlug and step name from varContext
          const filteredVarContext: Record<string, number> = {}
          Object.keys(varContext).forEach(k => {
            const stepSlugLower = stepSlug.toLowerCase()
            const stepNameLower = stepName.toLowerCase()
            const stepNameUnderscore = stepNameLower.replace(/\s+/g, '_')
            // Also filter if varContext key is contained in step name (e.g., "descuento" in "valor_descuento")
            const keyContained = stepSlugLower.includes(k) || stepNameLower.includes(k)
            if (!keyContained) {
              filteredVarContext[k] = varContext[k]
            }
          })

          const evalContext: Record<string, number> = {
            ...filteredVarContext,
            cantidad: cantidadConvertida,
            precio_unit: precioUnitBase,
            subtotal: baseCalculo,
            valor_condicion: valorBase,
            precio: valorBase,
            [stepSlug]: valorBase,
            // Also add alias without prefix (e.g., "valor_descuento" -> also add "descuento")
            ...(stepSlug.includes('_') ? { [stepSlug.split('_').pop()!]: valorBase } : {})
          }

          console.log(`DEBUG: Tax step "${paso.descripcion_corta}" - stepSlug: ${stepSlug}, valorBase: ${valorBase}, filter keys: ${Object.keys(filteredVarContext).join(', ')}`)

          // 2.2 Replace step references (s1, s2, etc.)
          formula = formula.replace(/\bs([0-9]+)\b/g, (match, num) => {
            return (results[num] || 0).toString()
          })

          // 2.3 Replace all variables from context
          Object.keys(evalContext)
            .sort((a, b) => b.length - a.length)
            .forEach(vName => {
              const regex = new RegExp(`\\b${vName}\\b`, 'gi')
              formula = formula.replace(regex, evalContext[vName].toString())
            })

          console.log(`DEBUG: Tax step "${paso.descripcion_corta}" - Formula after replace: "${formula}", valorBase: ${valorBase}`)

          // If required condition not found, set valorFinal to 0
          if (paso.condicion_id && !condicionEncontrada) {
            console.log(`DEBUG: Tax step "${paso.descripcion_corta}" - Required condition not found, using 0`)
            valorFinal = 0
          } else if (formula === '1' || formula === '') {
            if (esporcentaje) {
              valorFinal = baseCalculo * (valorBase / 100)
            } else {
              valorFinal = valorBase
            }
          } else {
            // eslint-disable-next-line no-eval
            valorFinal = eval(formula) || 0
            console.log(`DEBUG: Tax step "${paso.descripcion_corta}" Formula: ${originalFormula} -> ${formula} = ${valorFinal}`)
          }
        } catch (e) {
          console.error('DEBUG: Error evaluating formula for tax step:', paso.descripcion_corta, paso.formula, e)
          valorFinal = 0
        }

        // Update tax total
        if (paso.tipo === 'Impuesto') {
          totalImpuesto += valorFinal
          console.log(`DEBUG: Updated Total Tax: ${totalImpuesto}`)
        }

        // Store result for future steps (after all updates to valorFinal)
        results[paso.secuencia_paso.toString()] = valorFinal

        return {
          condicion_id: paso.condicion_id,
          esquema_id: paso.esquema_id,
          valor: valorFinal,
          codigo: paso.tipo,
          descripcion: paso.descripcion_corta,
          valor_original: paso.condicion_id && results[paso.secuencia_paso.toString()] !== undefined ? valorBase : undefined,
          es_porcentaje: esporcentaje
        }
      })

      console.log('DEBUG: After tax steps - subtotalBruto:', subtotalBruto, 'totalImpuesto:', totalImpuesto)
      console.log('DEBUG: Tax pasosCalculados:', taxCalculados.map(p => ({ desc: p.descripcion, valor: p.valor })))

      // Combine all calculated steps in original order
      const pasosCalculados: VentaDetalleCondicion[] = [...nonTaxCalculados, ...taxCalculados].sort((a, b) => {
        const aPaso = activePasos.find(p => p.descripcion_corta === a.descripcion)
        const bPaso = activePasos.find(p => p.descripcion_corta === b.descripcion)
        return (aPaso?.secuencia_paso || 0) - (bPaso?.secuencia_paso || 0)
      })

      console.log('DEBUG: Calculation completed. Total Tax:', totalImpuesto, 'Final Subtotal:', subtotalBruto)
      console.log('DEBUG: pasosCalculados summary:', pasosCalculados.map(p => ({ desc: p.descripcion, tipo: p.codigo, valor: p.valor })))

      console.log('DEBUG: Final calculation values:')
      console.log('  subtotalBruto:', subtotalBruto)
      console.log('  descuentoPromocion:', descuentoPromocion)
      console.log('  descuentoCupon:', descuentoCupon)
      console.log('  totalDescuento:', totalDescuento)
      console.log('  totalImpuesto:', totalImpuesto)
      console.log('  Final descuento (commercial):', totalDescuento - descuentoPromocion - descuentoCupon)
      console.log('  Final subtotal:', subtotalBruto - descuentoCupon)

      setLineas(prev => {
        const next = [...prev]
        if (next[index]) {
          // Merge existing line with promotion data from lineaData and calculated values
          const l: VentaDetalle = {
            ...next[index],
            ...lineaData, // includes promotion fields (promocion_id, etc.)
            pasos_calculados: pasosCalculados,
            cantidad: cantidad,
            precio_unit: precioUnitBase,
            descuento: totalDescuento - descuentoPromocion - descuentoCupon, // Commercial discount
            descuento_cupon: descuentoCupon,
            descuento_cupon_unitario: descuentoCuponUnitario,
            descuento_promocion: descuentoPromocion,
            impuesto: totalImpuesto,
            subtotal: subtotalBruto
          }
          console.log('DEBUG: Line updated:', {
            cantidad: l.cantidad,
            precio_unit: l.precio_unit,
            descuento: l.descuento,
            descuento_cupon: l.descuento_cupon,
            descuento_promocion: l.descuento_promocion,
            impuesto: l.impuesto,
            subtotal: l.subtotal
          })
          next[index] = l
        }
        return next
      })
    } catch (error) {
      console.error('Error in calculateLineCalculations:', error)
    }
  }

  // -----------------------------------------------------------
  // Promotion validation
  // Checks /api/pos/promociones for active promos on canal='pos'
  // on the current sale date. Groups all materials that apply to the same
  // promotion and calculates based on TOTAL quantity.
  // -----------------------------------------------------------
  const checkPromocion = async (
    index: number,
    materialId: number,
    categoriaId: number | null | undefined,
    lineaData?: VentaDetalle,
    updatedLines?: VentaDetalle[]
  ) => {
    if (!materialId) return
    try {
      const fechaParam = fechaVenta || new Date().toISOString().split('T')[0]
      console.log(`DEBUG: Checking promotion for index ${index}, material ${materialId}, category ${categoriaId}, date ${fechaParam}`)

      // Use updated lines if provided, otherwise use state
      const sourceLines = updatedLines || lineas
      console.log(`DEBUG: Source lines for promo group:`, sourceLines.map(l => l.material_codigo))

      // Get ALL materials from current lines to group by promotion
      const allMaterialIds = sourceLines
        .filter(l => l.material_id && l.material_id !== materialId)
        .map(l => l.material_id!)
      allMaterialIds.push(materialId)

      console.log(`DEBUG: Checking promotions for ALL materials:`, allMaterialIds)

      const res = await apiFetch(
        `/api/pos/promociones?materialIds=${allMaterialIds.join(',')}&fecha=${fechaParam}`
      )
      if (!res.ok) {
        console.log(`DEBUG: API call failed for promotions`)
        return
      }
      const json = await res.json()
      const promos: Array<{
        id: number
        nombre: string
        cantidad_compra: number
        cantidad_regalo: number
        material_ids: number[]
        categoria_ids: number[]
      }> = json.data || []
      console.log(`DEBUG: Found ${promos.length} promotions for all materials`)

      // Get current line data
      const currentLinea = lineaData || sourceLines[index]
      if (!currentLinea) return

      // Group materials by promotion
      const promoGroups = new Map<number, { promo: typeof promos[0]; materialIds: number[] }>()

      promos.forEach(promo => {
        if (!promoGroups.has(promo.id)) {
          promoGroups.set(promo.id, { promo, materialIds: [] })
        }
        // Add materials that apply to this promo
        promo.material_ids.forEach(mid => {
          const group = promoGroups.get(promo.id)!
          if (!group.materialIds.includes(mid)) {
            group.materialIds.push(mid)
          }
        })
        promo.categoria_ids.forEach(cid => {
          // Check which lines have this category
          const grp = promoGroups.get(promo.id)!
          sourceLines.forEach(l => {
            if (l.categoria_id === cid && l.material_id && !grp.materialIds.includes(l.material_id)) {
              grp.materialIds.push(l.material_id)
            }
          })
        })
      })

      console.log(`DEBUG: Promotion groups:`, Array.from(promoGroups.values()).map(g => ({ id: g.promo.id, nombre: g.promo.nombre, materialIds: g.materialIds })))

      // Find promotion that applies to this specific material
      let encontrada: typeof promos[0] | undefined
      let promoGroup: { promo: typeof promos[0]; materialIds: number[] } | undefined

      for (const [promoId, group] of promoGroups) {
        if (group.materialIds.includes(materialId)) {
          encontrada = group.promo
          promoGroup = group
          break
        }
      }

      console.log(`DEBUG: Final promotion for material ${materialId}:`, encontrada ? encontrada.nombre : 'none')

      const promoLabel = encontrada ? encontrada.nombre : null
      const promoBadge = encontrada ? `${encontrada.cantidad_compra}x${encontrada.cantidad_regalo}` : null

      // Calculate TOTAL quantity for this promotion group
      let cantidadTotalGrupo = 0
      if (promoGroup) {
        sourceLines.forEach(l => {
          if (l.material_id && promoGroup.materialIds.includes(l.material_id)) {
            const um = l.unidad_multiplo || 1
            cantidadTotalGrupo += (l.cantidad || 0) * um
          }
        })
        console.log(`DEBUG: Total quantity for promo group ${encontrada?.nombre}: ${cantidadTotalGrupo}`)
      }

      // Choose the CHEAPEST line in the group to apply the discount (promo applies to cheapest)
      let chosenLineIndex = -1
      let minPrecio = Infinity
      if (promoGroup) {
        sourceLines.forEach((l, idx) => {
          if (l.material_id && promoGroup.materialIds.includes(l.material_id)) {
            const precio = l.precio_unit || 0
            if (precio > 0 && precio < minPrecio) {
              minPrecio = precio
              chosenLineIndex = idx
            }
          }
        })
      }
      console.log(`DEBUG: Chosen line for promo discount: index=${chosenLineIndex}, precio=${minPrecio}`)

      // Apply promo metadata to ALL lines in group (badge always shows if material is affected by promo)
      const updatedLineasPromo = sourceLines.map((l, idx) => {
        if (promoGroup && l.material_id && promoGroup.materialIds.includes(l.material_id)) {
          if (idx === chosenLineIndex) {
            return {
              ...l,
              promocion_id: encontrada!.id,
              promocion_label: promoLabel,
              promocion_badge: promoBadge, // Always show badge for affected materials
              promocion_cantidad_compra: encontrada!.cantidad_compra,
              promocion_cantidad_regalo: encontrada!.cantidad_regalo,
              cantidad_total_grupo: cantidadTotalGrupo,
              promo_aplicada: true // This line gets the discount
            }
          } else {
            return {
              ...l,
              promocion_id: encontrada!.id,
              promocion_label: promoLabel,
              promocion_badge: promoBadge, // Always show badge for all affected materials
              promocion_cantidad_compra: encontrada!.cantidad_compra,
              promocion_cantidad_regalo: encontrada!.cantidad_regalo,
              cantidad_total_grupo: cantidadTotalGrupo,
              promo_aplicada: false // This line does NOT get discount
            }
          }
        }
        return l
      })

      // Build updated line with promo data (for single line case)
      const updatedLinea: VentaDetalle = {
        ...currentLinea,
        promocion_id: encontrada?.id ?? null,
        promocion_label: promoLabel,
        promocion_badge: promoBadge,
        promocion_cantidad_compra: encontrada?.cantidad_compra ?? null,
        promocion_cantidad_regalo: encontrada?.cantidad_regalo ?? null,
        cantidad_total_grupo: cantidadTotalGrupo
      }

// Helper to recalculate all lines in the promo group
      const recalculatePromoGroup = (linesToUpdate: VentaDetalle[]) => {
        if (!promoGroup || !encontrada || cantidadTotalGrupo === 0) return linesToUpdate

        return linesToUpdate.map((l, idx) => {
          if (l.material_id && promoGroup.materialIds.includes(l.material_id)) {
            if (idx === chosenLineIndex) {
              const lineWithPromo: VentaDetalle = {
                ...l,
                promocion_id: encontrada!.id,
                promocion_label: promoLabel,
                promocion_badge: promoBadge, // Always show badge for affected materials
                promocion_cantidad_compra: encontrada!.cantidad_compra,
                promocion_cantidad_regalo: encontrada!.cantidad_regalo,
                cantidad_total_grupo: cantidadTotalGrupo,
                promo_aplicada: true // This line gets the discount
              }
              return lineWithPromo
            } else {
              const lineWithPromo: VentaDetalle = {
                ...l,
                promocion_id: encontrada!.id,
                promocion_label: promoLabel,
                promocion_badge: promoBadge, // Always show badge for all affected materials
                promocion_cantidad_compra: encontrada!.cantidad_compra,
                promocion_cantidad_regalo: encontrada!.cantidad_regalo,
                cantidad_total_grupo: cantidadTotalGrupo,
                promo_aplicada: false // This line does NOT get discount
              }
              return lineWithPromo
            }
          }
return l
        })
      }

      // Apply promo updates
      const linesToUpdate = updatedLines || lineas
      let updatedLinesFinal = linesToUpdate

      if (promoGroup) {
        // Update all lines in the group
        updatedLinesFinal = recalculatePromoGroup(linesToUpdate)
      } else {
        // Update single line
        updatedLinesFinal = linesToUpdate.map((l, i) => i === index ? updatedLinea : l)
      }

      setLineas(updatedLinesFinal);

      // Recalculate all lines in promo group
      if (promoGroup) {
        updatedLinesFinal.forEach((l, i) => {
          if (l.material_id && promoGroup!.materialIds.includes(l.material_id) && pasosEsquema.length > 0) {
            calculateLineCalculations(i, l.material_id, l.cantidad, l, undefined, undefined, cuponAplicadoGlobal);
          }
        });
      } else if (updatedLinea.material_id && pasosEsquema.length > 0) {
        calculateLineCalculations(index, updatedLinea.material_id, updatedLinea.cantidad, updatedLinea, undefined, undefined, cuponAplicadoGlobal);
      }
    } catch (err) {
      console.error('Error checking promocion:', err)
    }
  }

  const handleMaterialSelect = async (index: number, material: any) => {
    const newLineas = [...lineas]
    const precio = material.precio_venta || 0
    const currentLinea = newLineas[index]
    const umId = material.unidad_medida_id || 0

    // Fetch unidad_multiplo for the material's unit
    let unidadMultiplo = 1
    if (umId) {
      try {
        const umRes = await apiFetch(`/api/logistica/unidades?id=${umId}`)
        const umJson = await umRes.json()
        if (umJson.data?.unidad_multiplo) {
          unidadMultiplo = Number(umJson.data.unidad_multiplo) || 1
        }
      } catch (e) {
        console.error('Error fetching unidad_multiplo:', e)
      }
    }

    newLineas[index] = {
      ...currentLinea,
      material_id: material.id,
      material_codigo: material.codigo,
      material_descripcion: material.descripcion,
      unidad_medida_id: umId,
      unidad_medida_stock_id: material.unidad_medida_id || 0,
      um: material.unidad_medida?.abreviatura || 'UND',
      um_stock: material.unidad_medida_rel?.abreviatura || 'UND',
      unidad_multiplo: unidadMultiplo,
      precio_unit: precio,
      stock: null,
      categoria_id: material.categoria_id ?? null,
      promocion_id: null,
      promocion_label: null,
      promocion_badge: null,
      promocion_cantidad_compra: null,
      promocion_cantidad_regalo: null,
      cantidad_total_grupo: null,
      promo_aplicada: false,
      descuento_cupon: 0,
      descuento_cupon_unitario: 0,
      descuento_promocion: 0,
      aplica_cupon: false
    }

    if (cuponAplicadoGlobal) {
      const qualifies = await checkMaterialQualifiesForCupon(cuponAplicadoGlobal, material.id, material.categoria_id ?? null)
      if (qualifies) {
        // Mark that this material qualifies for the global coupon
        newLineas[index].aplica_cupon = true
        setMaterialesConCupon(prev => ({ ...prev, [newLineas[index].id]: true }))
      }
    }

    setLineas(newLineas)

    // Trigger stock fetch if other fields are present
    if (sucursal?.id && currentLinea.almacen_id && umId && clasePedido?.estado_stock_id) {
      fetchStock(index, material.id, currentLinea.almacen_id, sucursal.id, material.unidad_medida_id || umId, clasePedido.estado_stock_id)
    }

    // Trigger promotion check with all updated lines (for proper group calculation)
    checkPromocion(index, material.id, material.categoria_id ?? null, newLineas[index], newLineas)
  }

  const handleAlmacenSelect = (index: number, almacen: any) => {
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]

    newLineas[index] = {
      ...currentLinea,
      almacen_id: almacen.id,
      almacen_descripcion: almacen.descripcion,
      stock: null
    }
    setLineas(newLineas)

    if (sucursal?.id && currentLinea.material_id && currentLinea.unidad_medida_stock_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, almacen.id, sucursal.id, currentLinea.unidad_medida_stock_id, clasePedido.estado_stock_id)
    }
  }

  const handleUnidadChange = async (index: number, umId: number | undefined, abreviatura?: string) => {
    if (!umId) return
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]

    // Fetch unidad_multiplo for the selected unit
    let unidadMultiplo = 1
    try {
      const umRes = await apiFetch(`/api/logistica/unidades?id=${umId}`)
      const umJson = await umRes.json()
      if (umJson.data?.unidad_multiplo) {
        unidadMultiplo = Number(umJson.data.unidad_multiplo) || 1
      }
    } catch (e) {
      console.error('Error fetching unidad_multiplo:', e)
    }

    newLineas[index] = {
      ...currentLinea,
      unidad_medida_id: umId,
      um: abreviatura || currentLinea.um,
      unidad_multiplo: unidadMultiplo,
      stock: null
    }
    setLineas(newLineas)

    if (sucursal?.id && currentLinea.material_id && currentLinea.almacen_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, currentLinea.almacen_id, sucursal.id, currentLinea.unidad_medida_stock_id, clasePedido.estado_stock_id)
    }
  }

  const handleLineaChange = (index: number, field: keyof VentaDetalle, value: any) => {
    const newLineas = [...lineas]
    const l = { ...newLineas[index], [field]: value }

    // Update the line immediately in state
    newLineas[index] = l
    setLineas(newLineas)

    // If change is quantity or price_unit, we need to recalculate
    if (field === 'cantidad' || field === 'precio_unit' || field === 'descuento') {
      if (l.material_id && pasosEsquema.length > 0) {
        // Always recalculate promo group when quantity or price changes
        if ((field === 'cantidad' || field === 'precio_unit') && l.material_id) {
          checkPromocion(index, l.material_id, l.categoria_id, l, newLineas)
        } else {
          calculateLineCalculations(index, l.material_id, l.cantidad, l, undefined, undefined, cuponAplicadoGlobal)
        }
      } else {
        // Manual fallback if no schema
        const subtotalBruto = l.cantidad * l.precio_unit
        l.subtotal = subtotalBruto - l.descuento + l.impuesto
        setLineas(newLineas)
      }
    }
  }

  const checkActiveCashSession = async (sucId: number, monId: number) => {
    try {
      const res = await apiFetch(`/api/gestion-caja/sesion/activa?sucursalId=${sucId}&monedaId=${monId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.id ? data : null
    } catch (err) {
      console.error('Error checking active cash session:', err)
      return null
    }
  }

  const handleNumeroDocBlur = async () => {
    if (!numeroIdentificacion) return
    try {
      const res = await apiFetch(`/api/clientes?search=${numeroIdentificacion}&pageSize=50`)
      if (res.ok) {
        const body = await res.json()
        console.log('DEBUG: Clientes encontrados:', body.data?.length, 'buscando:', numeroIdentificacion)
        console.log('DEBUG: Datos recibidos:', JSON.stringify(body.data))
        const match = body.data?.find((c: any) => c.nif?.toString()?.toLowerCase() === numeroIdentificacion.toLowerCase())
        console.log('DEBUG: Cliente match:', match)
        if (match) {
          setCliente(match)
          setNombre(match.nombre || '')
          setNombresCompletos(match.nombres_completos || '')
          setApellidosCompletos(match.apellidos_completos || '')
          setDireccion(match.direccion || '')
          setDepartamento(match.departamento || '')
          setProvincia(match.provincia || '')
          setDistrito(match.distrito || '')
          console.log('DEBUG: Departamento asignado:', match.departamento)
          console.log('DEBUG: Provincia asignado:', match.provincia)
          console.log('DEBUG: Distrito asignado:', match.distrito)
          toast.success('Cliente encontrado y cargado')
        }
      }
    } catch (error) {
      console.error('Error buscando cliente:', error)
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!docIdentificacion) return toast.error('Debe seleccionar un Documento de Identidad')
    if (!numeroIdentificacion) return toast.error('Debe ingresar el número de documento')

    if (docIdentificacion.abreviatura === 'RUC' && !nombre) {
      return toast.error('Debe ingresar la Razón Social')
    }
    if (docIdentificacion.abreviatura !== 'RUC' && (!nombresCompletos || !apellidosCompletos)) {
      return toast.error('Debe ingresar Nombres y Apellidos completos')
    }

    if (!sucursal) return toast.error('Debe seleccionar una sucursal')
    if (!clasePedido) return toast.error('Debe seleccionar una clase de pedido')
    if (lineas.length === 0) return toast.error('Debe agregar al menos un producto')

    const invalidLine = lineas.find(l => !l.material_id || !l.almacen_id || !l.unidad_medida_id)
    if (invalidLine) return toast.error('Debe completar material, almacén y unidad para todos los productos')

    const selectedMediosPagoIds = Object.keys(mediosPagoSeleccionados).filter(id => mediosPagoSeleccionados[Number(id)].selected)

    if (selectedMediosPagoIds.length === 0) {
      return toast.error('Debe seleccionar al menos un medio de pago')
    }

    const sum = selectedMediosPagoIds.reduce((acc, id) => {
      const mp = mediosPagoSeleccionados[Number(id)]
      return acc + (parseFloat(mp.importe) || 0)
    }, 0)

    if (Math.abs(sum - totals.total) > 0.01) {
      return toast.error(`La suma de medios de pago (${formatCurrency(sum, { symbol: monedaSimbolo })}) no cuadra con el total. Corrija los importes.`)
    }

    if (clasePedido.registro_caja) {
      if (!monedaId) return toast.error('Debe seleccionar una moneda para validar la caja')
      const activeSession = await checkActiveCashSession(sucursal.id, monedaId)
      if (!activeSession) {
        return toast.error('No se encontró una caja aperturada para esta sucursal, moneda y usuario. Por favor, aperture caja antes de finalizar.')
      }
    }

    setLoading(true)
    try {
      // Concatenar nombres y apellidos si ambos tienen valores
      const nombreCompleto = (nombresCompletos && apellidosCompletos)
        ? `${nombresCompletos} ${apellidosCompletos}`.trim()
        : nombre

      const payload = {
        numero_pedido: `PED-${Date.now().toString().slice(-6)}`,
        comprobante,
        fecha_venta: new Date(fechaVenta).toISOString(),
        cliente_id: cliente?.id || null,
        documento_identificacion_id: docIdentificacion.id,
        numero_identificacion: numeroIdentificacion,
        nombre: nombreCompleto,
        nombres_completos: nombresCompletos,
        apellidos_completos: apellidosCompletos,
        direccion: direccion,
        departamento: departamento,
        provincia: provincia,
        distrito: distrito,
        sucursal_id: sucursal.id,
        clase_pedido_id: clasePedido.id,
        moneda_id: monedaId,
        estado: 'procesada',
        subtotal: totals.subtotal,
        descuento: totals.descuento,
        descuento_cupon: totals.descuento_cupon,
        descuento_promocion: totals.descuento_promocion,
        impuesto: totals.impuesto,
        total: totals.total,
        observaciones,
        medios_pago: selectedMediosPagoIds.map(id => ({
          medio_pago_id: Number(id),
          importe: parseFloat(mediosPagoSeleccionados[Number(id)].importe) || 0
        })),
        detalles: lineas.map(l => ({
          material_id: l.material_id,
          almacen_id: l.almacen_id,
          unidad_medida_id: l.unidad_medida_id,
          cantidad: l.cantidad,
          precio_unit: l.precio_unit,
          descuento: l.descuento,
          descuento_cupon: l.descuento_cupon,
          descuento_promocion: l.descuento_promocion,
          impuesto: l.impuesto,
          subtotal: l.subtotal,
          promocion_id: l.promocion_id || null,
          condiciones: l.pasos_calculados?.map(p => ({
            condicion_id: p.condicion_id,
            esquema_id: p.esquema_id,
            importe: p.valor,
            valor_condicion: p.valor_original,
            simbolo: p.es_porcentaje ? '%' : (monedaSimbolo || '$'),
            descripcion_corta: p.descripcion,
            tipo: p.codigo
          }))
        }))
      }

      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Error al registrar la venta')

      toast.success('Venta registrada correctamente')
      router.push('/ventas')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      <Topbar title="Registro de Ventas" />

      {/* Header Bar */}
      <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md py-4 border-b border-slate-100 dark:border-slate-800 px-8 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push('/ventas')}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                <span>VENTAS</span>
                <span className="text-slate-200 dark:text-slate-800">/</span>
                <span>REGISTRO</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none italic">
                Nueva Venta
              </h1>
            </div>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={loading}
            className="px-8 h-12 flex items-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95 text-[11px] font-black uppercase tracking-widest"
          >
            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Finalizar Venta
              </>
            )}
          </button>

          {/* Cards de Totales */}
          <div className="grid grid-cols-4 gap-3 px-8 pb-4 shrink-0">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</div>
              <div className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {mounted ? formatCurrency(totals.subtotal, { symbol: monedaSimbolo }) : '...'}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Descuento</div>
              <div className="text-base font-black text-red-600 tracking-tight">
                {mounted ? formatCurrency(totals.descuento + totals.descuento_cupon + totals.descuento_promocion, { symbol: monedaSimbolo }) : '...'}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Impuesto</div>
              <div className="text-base font-black text-amber-600 tracking-tight">
                {mounted ? formatCurrency(totals.impuesto, { symbol: monedaSimbolo }) : '...'}
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
              <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Total</div>
              <div className="text-xl font-black text-white tracking-tight">
                {mounted ? formatCurrency(totals.total, { symbol: monedaSimbolo }) : '...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Info */}
        <aside className="w-[320px] h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

          {/* Card: Transacción */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <button
              onClick={() => setExpandedCards(p => ({ ...p, generales: !p.generales }))}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Datos Generales</span>
              {expandedCards.generales ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedCards.generales && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800 mt-2">

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CLASE PEDIDO</label>
                  <ClasePedidoSelect
                    selectedLabel={clasePedido?.descripcion}
                    onSelect={async (c) => {
                      setClasePedido({
                        id: c.id,
                        descripcion: c.descripcion,
                        estado_stock_id: c.estado_stock_id,
                        registro_caja: c.registro_caja,
                        concepto_caja_id: c.concepto_caja_id
                      })
                      if (c.registro_caja) {
                        if (sucursal?.id && monedaId) {
                          const session = await checkActiveCashSession(sucursal.id, monedaId)
                          if (!session) {
                            toast.error('Atención: Esta clase de pedido requiere registro de caja, pero no se encontró una sesión aperturada.')
                          }
                        } else {
                          toast.error('Seleccione sucursal y moneda para validar la apertura de caja.')
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">MONEDA</label>
                  <MonedaSelect
                    value={monedaId || undefined}
                    onChange={(m) => {
                      if (m) {
                        setMonedaId(m.id)
                        setMonedaSimbolo(m.simbolo)
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">COMPROBANTE</label>
                  <input
                    type="text"
                    placeholder="F001-000001"
                    value={comprobante}
                    onChange={(e) => setComprobante(e.target.value)}
                    className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">FECHA VENTA</label>
                  <input
                    type="date"
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                    className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: Cliente */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <button
              onClick={() => setExpandedCards(p => ({ ...p, cliente: !p.cliente }))}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Cliente</span>
              {expandedCards.cliente ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedCards.cliente && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">TIPO DOC.</label>
                  <DocumentoIdentificacionSelect
                    value={docIdentificacion?.id}
                    onSelect={(d) => setDocIdentificacion({ id: d.id, abreviatura: d.abreviatura })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">NÚMERO DOC.</label>
                  <input
                    type="text"
                    value={numeroIdentificacion}
                    onBlur={handleNumeroDocBlur}
                    onChange={(e) => setNumeroIdentificacion(e.target.value)}
                    className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                {docIdentificacion?.abreviatura === 'RUC' ? (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">RAZÓN SOCIAL</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">NOMBRES</label>
                      <input
                        type="text"
                        value={nombresCompletos}
                        onChange={(e) => setNombresCompletos(e.target.value)}
                        className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">APELLIDOS</label>
                      <input
                        type="text"
                        value={apellidosCompletos}
                        onChange={(e) => setApellidosCompletos(e.target.value)}
                        className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">DIRECCIÓN</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DEP.</label>
                    <input type="text" value={departamento} onChange={e => setDepartamento(e.target.value)} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PROV.</label>
                    <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DISTRITO</label>
                  <input type="text" value={distrito} onChange={e => setDistrito(e.target.value)} className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Card: Otros */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <button
              onClick={() => setExpandedCards(p => ({ ...p, otros: !p.otros }))}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Observaciones</span>
              {expandedCards.otros ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedCards.otros && (
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2">
                <textarea
                  rows={3}
                  placeholder="Notas adicionales..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Card: Medios de Pago */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <button
              onClick={() => setExpandedCards(p => ({ ...p, pagos: !p.pagos }))}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Pagos</span>
                {Object.values(mediosPagoSeleccionados).some(mp => mp.selected) && (
                  <span className="size-2 rounded-full bg-blue-500"></span>
                )}
              </div>
              {expandedCards.pagos ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedCards.pagos && (
              <div className="p-4 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <div className="space-y-2">
                  {mediosPagoOptions.map(mp => (
                    <div key={mp.id} className="flex flex-col gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mediosPagoSeleccionados[mp.id]?.selected || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            let currentSum = 0
                            Object.keys(mediosPagoSeleccionados).forEach(key => {
                              if (Number(key) !== mp.id && mediosPagoSeleccionados[Number(key)]?.selected) {
                                currentSum += parseFloat(mediosPagoSeleccionados[Number(key)].importe) || 0
                              }
                            })

                            const remaining = Math.max(0, totals.total - currentSum)

                            setMediosPagoSeleccionados(prev => ({
                              ...prev,
                              [mp.id]: {
                                selected: isChecked,
                                importe: isChecked ? remaining.toFixed(2) : ''
                              }
                            }))
                          }}
                          className="size-4 rounded text-blue-600 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{mp.descripcion}</span>
                      </div>
                      {mediosPagoSeleccionados[mp.id]?.selected && (
                        <div className="relative ml-6">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{monedaSimbolo}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={mediosPagoSeleccionados[mp.id]?.importe || ''}
                            onChange={(e) => setMediosPagoSeleccionados({
                              ...mediosPagoSeleccionados,
                              [mp.id]: { selected: true, importe: e.target.value }
                            })}
                            className="w-full h-8 pl-8 pr-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:border-blue-500 outline-none text-right"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {(() => {
                    const sum = Object.values(mediosPagoSeleccionados)
                      .filter(mp => mp.selected)
                      .reduce((acc, mp) => acc + (parseFloat(mp.importe) || 0), 0)
                    const diff = totals.total - sum
                    const isAnySelected = Object.values(mediosPagoSeleccionados).some(mp => mp.selected)

                    if (!isAnySelected) return null

                    return (
                      <div className={cn(
                        "mt-3 p-3 rounded-xl border text-[10px] font-black uppercase flex justify-between items-center",
                        Math.abs(diff) < 0.01
                          ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
                      )}>
                        <span>DIFERENCIA:</span>
                        <span className="text-sm">{monedaSimbolo} {Math.abs(diff).toFixed(2)}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>


        </aside>

        {/* Main Content: Products */}
        <main className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Detalle de Productos</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium italic">Seleccione los artículos y cantidades para esta transacción.</p>
              </div>
              <div className="flex items-center gap-3">
                {cuponesActivos.length > 0 && !cuponAplicadoGlobal && lineas.filter(l => l.material_id).length > 0 && (
                  <select
                    value=""
                    onChange={async (e) => {
                      const cuponId = Number(e.target.value)
                      if (cuponId) {
                        const cupon = cuponesActivos.find(c => c.id === cuponId)
                        if (cupon) {
                          await aplicarCuponGlobal(cupon)
                        }
                      }
                    }}
                    className="h-12 px-4 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                  >
                    <option value="">+ Aplicar cupón</option>
                    {cuponesActivos.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.tipo === 'PORCENTAJE' ? `${c.valor}%` : `${monedaSimbolo}${c.valor}`})
                      </option>
                    ))}
                  </select>
                )}
                {cuponAplicadoGlobal && (
                  <span className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-green-100 dark:bg-green-500/15 border border-green-300 dark:border-green-500/30 text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider">
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>local_offer</span>
                    {cuponAplicadoGlobal.nombre} ({cuponAplicadoGlobal.tipo === 'PORCENTAJE' ? `${cuponAplicadoGlobal.valor}%` : `${monedaSimbolo}${cuponAplicadoGlobal.valor}`})
                    <button
                      type="button"
                      onClick={() => eliminarCuponGlobal()}
                      className="ml-1 hover:bg-green-200 dark:hover:bg-green-500/30 rounded-full p-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={addLinea}
                  className="h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  Añadir Producto
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {lineas.map((linea, index) => (
                <div key={linea.id} className="p-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 mt-1 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-[11px] font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="grid grid-cols-12 gap-5 items-start">
                        {/* Material and Stock Row */}
                        <div className="col-span-4">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">PRODUCTO / MATERIAL</label>
                          <MaterialSelect
                            selectedLabel={linea.material_descripcion}
                            onSelect={(m) => handleMaterialSelect(index, m)}
                            placeholder="Buscar..."
                          />
                          {linea.precio_unit > 0 && (
                            <div className="mt-1.5 flex items-center justify-between w-full pr-0.5">
                              <div className="flex items-center gap-1.5 ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                                  Precio Unitario: <span className="text-blue-600 font-black tracking-tight">{mounted ? formatCurrency(linea.precio_unit, { symbol: monedaSimbolo }) : '...'}</span>
                                </span>
                              </div>
                              {linea.promocion_badge && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-[7px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider animate-in fade-in duration-300">
                                  <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>local_offer</span>
                                  {linea.promocion_badge}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">ALMACÉN</label>
                          <AlmacenSelect
                            selectedLabel={linea.almacen_descripcion}
                            onSelect={(a) => handleAlmacenSelect(index, a)}
                            sucursalId={sucursal?.id}
                          />
                          {linea.stock !== null && (
                            <div className="mt-2 flex items-center gap-1.5 ml-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                                Stock: <span className={cn(linea.stock <= 0 ? "text-red-500" : "text-blue-600 font-black tracking-tight")}>{linea.stock}</span> {linea.um_stock}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">UNIDAD</label>
                          <UnidadSelect
                            value={linea.unidad_medida_id}
                            onChange={(id) => handleUnidadChange(index, id)}
                            materialId={linea.material_id || undefined}
                            enabled={!!linea.material_id}
                          />
                          {linea.aplica_cupon && linea.cupon_codigo && (
                            <div className="mt-1 flex items-center justify-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/30 text-[6px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>redeem</span>
                                {linea.cupon_codigo}
                                <span className="ml-1 font-bold">
                                  {linea.cupon_descuento && linea.cupon_descuento > 0 ? `-${linea.cupon_descuento}%` : ''}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CANTIDAD</label>
                          <input
                            type="number"
                            value={linea.cantidad}
                            onChange={(e) => handleLineaChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-right outline-none focus:border-blue-500 transition-all"
                          />
                          <div className="mt-1 flex items-center justify-center gap-2">
                            {linea.promo_aplicada && linea.promocion_badge && linea.cantidad_total_grupo && linea.promocion_cantidad_compra && linea.cantidad_total_grupo >= linea.promocion_cantidad_compra && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/15 border border-green-300 dark:border-green-500/30 text-[7px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider">
                                <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>local_offer</span>
                                {linea.promocion_label}
                                <span className="ml-1 px-1 py-0.5 rounded bg-slate-900 text-white text-[6px] font-bold">
                                  {Math.floor(linea.cantidad_total_grupo / linea.promocion_cantidad_compra) * (linea.promocion_cantidad_regalo || 1)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {linea.pasos_calculados && linea.pasos_calculados.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                          {/* Collapsible Header */}
                          <button
                            type="button"
                            onClick={() => toggleLineExpansion(linea.id)}
                            className="w-full flex items-center justify-between gap-2 px-1 py-1 group/btn text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <BarChart2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                Desglose de Esquema de Cálculo
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Summary pill when collapsed */}
                              {!expandedLines.has(linea.id) && (
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                                  {mounted ? formatCurrency(linea.subtotal, { symbol: monedaSimbolo }) : '...'}
                                </span>
                              )}
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover/btn:bg-blue-100 group-hover/btn:text-blue-600 transition-all">
                                {expandedLines.has(linea.id)
                                  ? <ChevronUp className="w-3 h-3" />
                                  : <ChevronDown className="w-3 h-3" />}
                              </span>
                            </div>
                          </button>

                          {/* Expanded Breakdown */}
                          {expandedLines.has(linea.id) && (
                            <div className="mt-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                {linea.pasos_calculados.map((paso, pIndex) => (
                                  <div
                                    key={pIndex}
                                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-all group/item"
                                  >
                                    <p className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 group-hover/item:text-blue-500 transition-colors mb-1">
                                      <span className="truncate">{paso.descripcion}</span>
                                      {(paso.codigo === 'Descuento' || paso.codigo === 'Impuesto') && paso.valor_original !== undefined && paso.valor_original !== 0 && (
                                        <span className="shrink-0 text-blue-500 ml-2 font-black">
                                          {paso.es_porcentaje ? `${paso.valor_original}%` : `${monedaSimbolo || '$'} ${paso.valor_original}`}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[12px] font-black text-slate-900 dark:text-white group-hover/item:text-blue-600 transition-colors">
                                      {mounted ? formatCurrency(paso.valor, { symbol: monedaSimbolo }) : '...'}
                                    </p>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-tight mt-0.5">
                                      {paso.codigo}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeLinea(index)}
                      className="w-9 h-9 mt-5 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {lineas.length === 0 && (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800">receipt_long</span>
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sin ítems en el carrito</h4>
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
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  )
}
