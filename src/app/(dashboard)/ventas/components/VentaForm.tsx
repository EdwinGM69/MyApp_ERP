'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { localToday, parseLocalNoon } from '@/lib/dates'
import { apiFetch, getAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MaterialSelect from '@/components/ui/MaterialSelect'
import DocumentoIdentificacionSelect from '@/components/ui/DocumentoIdentificacionSelect'
import ClasePedidoSelect from '@/components/ui/ClasePedidoSelect'
import AlmacenSelect from '@/components/ui/AlmacenSelect'
import UnidadSelect from '@/components/ui/UnidadSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import Topbar from '@/components/layout/Topbar'
import { useSucursal } from '@/contexts/SucursalContext'

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
  unidad_medida_stock_id: number
  um: string
  um_stock: string
  unidad_multiplo: number
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
  promocion_id?: number | null
  promocion_label?: string | null
  promocion_badge?: string | null
  promocion_cantidad_compra?: number | null
  promocion_cantidad_regalo?: number | null
  cantidad_total_grupo?: number | null
  promo_aplicada?: boolean
  categoria_id?: number | null
  aplica_cupon?: boolean
  cupon_codigo?: string | null
  cupon_descuento?: number | null
}

const MOTIVO_OPTIONS = [
  'Venta no registrada en POS',
  'Contingencia del sistema',
  'Falla de conexión',
  'Corrección autorizada',
  'Venta registrada posteriormente',
  'Otro',
]

export default function VentaForm() {
  const router = useRouter()
  const { currentSucursal } = useSucursal()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  const [monedaId, setMonedaId] = useState<number | null>(null)
  const [monedaSimbolo, setMonedaSimbolo] = useState('$')

  const [comprobante, setComprobante] = useState('')
  const [fechaVenta, setFechaVenta] = useState('')
  const [horaVenta, setHoraVenta] = useState('')
  const [motivo, setMotivo] = useState(MOTIVO_OPTIONS[0])
  const [referencia, setReferencia] = useState('')
  const [justificacion, setJustificacion] = useState('')

  const [fechaRegularizacion] = useState(() => {
    const now = new Date()
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })

  useEffect(() => {
    setMounted(true)
    if (!editandoRef.current) {
      setFechaVenta(localToday())
      const now = new Date()
      setHoraVenta(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
    }
    const user = getAuthStore().user
    if (user?.monedaId) setMonedaId(user.monedaId)
    if (user?.monedaSimbolo) setMonedaSimbolo(user.monedaSimbolo)
    if (currentSucursal) {
      setSucursal({ id: currentSucursal.id, descripcion: currentSucursal.descripcion })
    }
    fetchCuponesActivos()
  }, [currentSucursal])

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const editandoRef = useRef<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editar = params.get('editar')
    if (editar) {
      editandoRef.current = editar
      setEditandoId(editar)
    }
  }, [])

  useEffect(() => {
    if (!editandoId) return
    let cancelled = false

    const loadVenta = async () => {
      try {
        if (mediosPagoOptions.length === 0) {
          const mpRes = await apiFetch('/api/tesoreria/medios-pago?pageSize=100')
          if (mpRes.ok) {
            const mpJson = await mpRes.json()
            if (mpJson.data?.length) setMediosPagoOptions(mpJson.data)
          }
        }

        const res = await apiFetch(`/api/ventas?id=${editandoId}`)
        if (!res.ok) return
        const json = await res.json()
        const v = json.data
        if (!v || cancelled) return

        const pad2 = (n: number) => n.toString().padStart(2, '0')
        const fecha = new Date(v.fecha_venta)
        setComprobante(v.comprobante || '')
        setFechaVenta(`${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`)
        if (v.hora_venta) setHoraVenta(v.hora_venta)
        setMotivo(v.motivo && MOTIVO_OPTIONS.includes(v.motivo) ? v.motivo : MOTIVO_OPTIONS[0])
        setReferencia(v.referencia || '')
        setJustificacion(v.observaciones || '')

        if (v.cliente) setCliente({ id: v.cliente.id, nombre: v.cliente.nombre, nif: v.cliente.nif })
        setDocIdentificacion(v.dcto_identificacion ? { id: v.dcto_identificacion.id, abreviatura: v.dcto_identificacion.abreviatura } : null)
        setNumeroIdentificacion(v.numero_identificacion || '')
        setNombre(v.nombre || '')
        setNombresCompletos(v.nombres_completos || '')
        setApellidosCompletos(v.apellidos_completos || '')
        setDireccion(v.direccion || '')
        setUbigeo(v.ubigeo || '')
        setDepartamento(v.departamento || '')
        setProvincia(v.provincia || '')
        setDistrito(v.distrito || '')
        if (v.cliente_id || v.numero_identificacion) {
          consultadoRef.current = true
          setShowClientForm(false)
        }

        if (v.sucursal) setSucursal({ id: v.sucursal.id, descripcion: v.sucursal.descripcion })
        if (v.clase_pedido) {
          setClasePedido({
            id: v.clase_pedido.id,
            descripcion: v.clase_pedido.descripcion,
            estado_stock_id: v.clase_pedido.estado_stock_id ?? undefined,
            registro_caja: v.clase_pedido.registro_caja,
            concepto_caja_id: v.clase_pedido.concepto_caja_id ?? undefined,
          })
        }
        if (v.moneda_id) setMonedaId(v.moneda_id)
        if (v.moneda?.simbolo) setMonedaSimbolo(v.moneda.simbolo)

        const lineasCargadas: VentaDetalle[] = (v.detalles || []).map((d: any) => ({
          id: String(d.id),
          material_id: d.material_id,
          material_codigo: d.material?.codigo || '',
          material_descripcion: d.material?.descripcion || '',
          almacen_id: d.almacen_id,
          almacen_descripcion: d.almacen?.descripcion || '',
          unidad_medida_id: d.unidad_medida_id,
          unidad_medida_stock_id: 0,
          um: d.unidad_medida?.abreviatura || 'UND',
          um_stock: 'UND',
          unidad_multiplo: 1,
          cantidad: Number(d.cantidad),
          precio_unit: Number(d.precio_unit),
          descuento: Number(d.descuento) || 0,
          descuento_cupon: Number(d.descuento_cupon) || 0,
          descuento_promocion: Number(d.descuento_promocion) || 0,
          impuesto: Number(d.impuesto) || 0,
          subtotal: Number(d.subtotal) || 0,
          stock: null,
          pasos_calculados: (d.condiciones || []).map((c: any) => ({
            condicion_id: c.condicion_id ?? null,
            esquema_id: c.esquema_id ?? null,
            valor: Number(c.importe) || 0,
            valor_original: Number(c.valor_condicion) || 0,
            es_porcentaje: c.simbolo === '%',
            codigo: c.tipo,
            descripcion: c.descripcion_corta,
          })),
          promocion_id: d.promocion_id ?? null,
          aplica_cupon: d.cupon_id != null,
        }))
        setLineas(lineasCargadas)
        setExpandedLines(new Set())

        if (mediosPagoOptions.length === 0) {
          const mpRes = await apiFetch('/api/tesoreria/medios-pago?pageSize=100')
          if (mpRes.ok) {
            const mpJson = await mpRes.json()
            if (mpJson.data?.length) {
              setMediosPagoOptions(mpJson.data)
            }
          }
        }
        setPagos((v.medios_pago || []).map((p: any) => ({
          medio_pago_id: p.medio_pago_id,
          importe: String(p.importe ?? ''),
          referencia: p.numero_operacion || ''
        })))
      } catch (err) {
        console.error('Error cargando venta para edición:', err)
      }
    }

    loadVenta()
    return () => {
      cancelled = true
    }
  }, [editandoId])

  const [cliente, setCliente] = useState<{ id: number; nombre: string; nif?: string } | null>(null)
  const [docIdentificacion, setDocIdentificacion] = useState<{ id: number; abreviatura: string } | null>(null)
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('')
  const [nombre, setNombre] = useState('')
  const [nombresCompletos, setNombresCompletos] = useState('')
  const [apellidosCompletos, setApellidosCompletos] = useState('')
  const [direccion, setDireccion] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [provincia, setProvincia] = useState('')
  const [distrito, setDistrito] = useState('')
  const [ubigeo, setUbigeo] = useState('')
  const [esNuevoCliente, setEsNuevoCliente] = useState(false)
  const [consultandoAPI, setConsultandoAPI] = useState(false)
  const consultandoAPIRef = useRef(false)
  const consultadoRef = useRef(false)
  const [showClientForm, setShowClientForm] = useState(false)

  const [mediosPagoOptions, setMediosPagoOptions] = useState<any[]>([])
  const [pagos, setPagos] = useState<Array<{ medio_pago_id: number; importe: string; referencia: string }>>([])

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
    id: number
    descripcion: string
    estado_stock_id?: number
    registro_caja?: boolean
    concepto_caja_id?: number
  } | null>(null)
  const [pasosEsquema, setPasosEsquema] = useState<EsquemaCalculoPaso[]>([])
  const [variablesEsquema, setVariablesEsquema] = useState<any[]>([])

  useEffect(() => {
    if (clasePedido?.id) {
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
              lineas.forEach((l, idx) => {
                if (l.material_id) {
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

  const [lineas, setLineas] = useState<VentaDetalle[]>([])

  const [cuponesActivos, setCuponesActivos] = useState<any[]>([])
  const [showCuponSelector, setShowCuponSelector] = useState<Record<string, boolean>>({})
  const [cuponSeleccionado, setCuponSeleccionado] = useState<Record<string, any>>({})
  const [cuponAplicadoGlobal, setCuponAplicadoGlobal] = useState<any>(null)
  const [materialesConCupon, setMaterialesConCupon] = useState<Record<string, boolean>>({})

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
      aplica_cupon: false,
    }
    setLineas([...lineas, newLinea])
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
    if (!hasOtherMaterials && cuponAplicadoGlobal) {
      eliminarCuponGlobal()
    }
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
        const hoy = new Date(fechaVenta || new Date())
        const filtrados = (json.data || []).filter((c: any) =>
          c.activo && new Date(c.fecha_inicio) <= hoy && new Date(c.fecha_fin) >= hoy
        )
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
    try {
      const [detallesRes, categoriasRes] = await Promise.all([
        apiFetch(`/api/precios/cupones/${cupon.id}/detalles`),
        apiFetch(`/api/precios/cupones/${cupon.id}/categorias`),
      ])
      const detallesJson = await detallesRes.json()
      const categoriasJson = await categoriasRes.json()
      const cuponDetalles = detallesJson.data || []
      const cuponCategorias = categoriasJson.data || []
      const materialIdsAplica = new Set(cuponDetalles.map((d: any) => d.material_id))
      const categoriaIdsAplica = new Set(cuponCategorias.map((c: any) => c.categoria_id))
      const sinRestricciones = cuponDetalles.length === 0 && cuponCategorias.length === 0
      const qualifyingLines: Array<{ id: string; linea: (typeof lineas)[0]; unitario: number; total: number }> = []
      lineas.forEach(linea => {
        if (!linea.material_id) return
        const materialMatch = materialIdsAplica.has(linea.material_id)
        const categoryMatch = linea.categoria_id && categoriaIdsAplica.has(linea.categoria_id)
        if (sinRestricciones || materialMatch || categoryMatch) {
          const cuponValorUnitario = cupon.tipo === 'PORCENTAJE' ? linea.precio_unit * (cupon.valor / 100) : cupon.valor
          const cuponValorTotal = cuponValorUnitario * linea.cantidad
          qualifyingLines.push({ id: linea.id, linea, unitario: cuponValorUnitario, total: cuponValorTotal })
        }
      })
      if (qualifyingLines.length === 0) {
        toast.error('El cupón no puede aplicarse a ningún material en el detalle')
        return
      }
      const totalCuponDescuento = qualifyingLines.reduce((sum, q) => sum + q.total, 0)
      qualifyingLines.sort((a, b) => b.linea.cantidad - a.linea.cantidad)
      const chosen = qualifyingLines[0]
      const chosenUnitario = totalCuponDescuento / chosen.linea.cantidad
      const updatedLineas = lineas.map(linea => {
        if (linea.id === chosen.id) {
          return { ...linea, descuento_cupon_unitario: chosenUnitario, descuento_cupon: totalCuponDescuento, aplica_cupon: true, cupon_codigo: cupon.nombre || cupon.codigo, cupon_descuento: cupon.tipo === 'PORCENTAJE' ? cupon.valor : cupon.valor }
        } else {
          return { ...linea, descuento_cupon_unitario: 0, descuento_cupon: 0, aplica_cupon: qualifyingLines.some(q => q.id === linea.id), cupon_codigo: null, cupon_descuento: null }
        }
      })
      setCuponAplicadoGlobal(cupon)
      setMaterialesConCupon({ [chosen.id]: true })
      setLineas(updatedLineas)
      updatedLineas.forEach((linea, index) => {
        if (linea.material_id && linea.pasos_calculados) {
          calculateLineCalculations(index, linea.material_id, linea.cantidad, linea, undefined, undefined, cupon)
        }
      })
      toast.success(`Cupón "${cupon.nombre}" aplicado`)
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
      const updatedLineas = lineas.map(linea => ({
        ...linea,
        descuento_cupon: 0,
        descuento_cupon_unitario: 0,
        aplica_cupon: false,
        cupon_codigo: null,
        cupon_descuento: null,
      }))
      setLineas(updatedLineas)
      updatedLineas.forEach((linea, index) => {
        if (linea.material_id && linea.pasos_calculados) {
          calculateLineCalculations(index, linea.material_id, linea.cantidad, linea)
        }
      })
      toast.success('Cupón eliminado')
    }
  }

  const checkMaterialQualifiesForCupon = async (cupon: any, materialId: number, categoriaId: number | null | undefined): Promise<boolean> => {
    try {
      const [detallesRes, categoriasRes] = await Promise.all([
        apiFetch(`/api/precios/cupones/${cupon.id}/detalles`),
        apiFetch(`/api/precios/cupones/${cupon.id}/categorias`),
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
    const unidadMultiplo = lineaData.unidad_multiplo || 1
    const cantidadConvertida = cantidad * unidadMultiplo
    const promocionId = lineaData?.promocion_id
    const promocionCantidadCompra = lineaData?.promocion_cantidad_compra
    const promocionCantidadRegalo = lineaData?.promocion_cantidad_regalo
    const cantidadTotalGrupo = lineaData?.cantidad_total_grupo || null
    const promoAplicada = lineaData?.promo_aplicada || false
    const descuentoCuponUnitario = lineaData?.descuento_cupon_unitario || 0
    const descuentoCupon = lineaData?.descuento_cupon || 0
    if (!materialId || activePasos.length === 0) return
    try {
      const dateForFiltering = new Date(fechaVenta || localToday())
      const [resSpecific, resGeneral] = await Promise.all([
        apiFetch(`/api/comercial/condiciones?material_id=${materialId}`),
        apiFetch(`/api/comercial/condiciones?material_id=null`),
      ])
      const jsonSpecific = await resSpecific.json()
      const jsonGeneral = await resGeneral.json()
      const rawCondiciones: any[] = [...(jsonSpecific.data || []), ...(jsonGeneral.data || [])]
      const todasCondiciones: any[] = rawCondiciones.filter((c: any) =>
        c.activo && (!monedaId || c.moneda_id === monedaId) && new Date(c.fecha_desde) <= dateForFiltering && (!c.fecha_hasta || new Date(c.fecha_hasta) >= dateForFiltering)
      )
      let precioUnitBase = lineaData?.precio_unit || 0
      let subtotalBruto = cantidadConvertida * precioUnitBase
      let totalImpuesto = 0
      let totalDescuento = 0
      let descuentosUnitarios = 0
      let descuentoPromocion = 0
      let descuentoCuponCalc = 0
      let descuentoCuponUnitarioAcumulado = lineaData?.descuento_cupon_unitario || 0
      const results: Record<string, number> = {}
      const varContext: Record<string, number> = {}
      activeVariables.forEach(v => {
        if (v.variable_id) {
          const val = typeof v.valor === 'number' ? v.valor : parseFloat(v.valor || '0')
          varContext[v.variable_id.toLowerCase().trim()] = isNaN(val) ? 0 : val
        }
      })
      const taxPasos = activePasos.filter(p => p.tipo === 'Impuesto')
      const nonTaxPasos = activePasos.filter(p => p.tipo !== 'Impuesto')
      const nonTaxCalculados: VentaDetalleCondicion[] = nonTaxPasos.map(paso => {
        let valorBase = 0
        let esporcentaje = false
        let condicionEncontrada = false
        if (paso.condicion_id) {
          const condicionEspecifica = todasCondiciones.find((c: any) => Number(c.tipo_condicion_id) === Number(paso.condicion_id) && Number(c.material_id) === Number(materialId))
          const condicionGeneral = todasCondiciones.find((c: any) => Number(c.tipo_condicion_id) === Number(paso.condicion_id) && (c.material_id === null || c.material_id === undefined))
          const condicion = condicionEspecifica || condicionGeneral
          if (condicion) {
            condicionEncontrada = true
            valorBase = parseFloat(condicion.valor) || 0
            esporcentaje = condicion.porcentaje === true
          } else {
            const isCuponStep = paso.descripcion_corta.toLowerCase().includes('cupon') || paso.descripcion_corta.toLowerCase().includes('cupón')
            if (isCuponStep && globalCupon) {
              condicionEncontrada = true
              valorBase = globalCupon.valor
              esporcentaje = globalCupon.tipo === 'PORCENTAJE'
            } else {
              valorBase = 0
              esporcentaje = true
            }
          }
        } else {
          if (paso.tipo === 'Impuesto') {
            valorBase = 0
            esporcentaje = true
          }
        }
        let valorFinal = 0
        try {
          let formula = (paso.formula || '1').toLowerCase().trim()
          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)
          const stepSlug = paso.descripcion_corta.toLowerCase().trim().replace(/\s+/g, '_')
          const stepName = paso.descripcion_corta.toLowerCase().trim()
          const filteredVarContext: Record<string, number> = {}
          Object.keys(varContext).forEach(k => {
            const stepSlugLower = stepSlug.toLowerCase()
            const stepNameLower = stepName.toLowerCase()
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
            ...(stepSlug.includes('_') ? { [stepSlug.split('_').pop()!]: valorBase } : {}),
          }
          formula = formula.replace(/\bs([0-9]+)\b/g, (match, num) => (results[num] || 0).toString())
          Object.keys(evalContext)
            .sort((a, b) => b.length - a.length)
            .forEach(vName => {
              const regex = new RegExp(`\\b${vName}\\b`, 'gi')
              formula = formula.replace(regex, evalContext[vName].toString())
            })
          if (paso.condicion_id && !condicionEncontrada) {
            valorFinal = 0
          } else if (formula === '1' || formula === '') {
            valorFinal = esporcentaje ? baseCalculo * (valorBase / 100) : valorBase
          } else {
            // eslint-disable-next-line no-eval
            valorFinal = eval(formula) || 0
          }
        } catch (e) {
          console.error('Error evaluating formula:', paso.descripcion_corta, e)
          valorFinal = 0
        }
        if (paso.tipo === 'Precio') {
          if (paso.condicion_id && !condicionEncontrada) {
            // Sin condición de precio configurada → conservar precioUnitBase (precio_venta del material)
          } else {
            const formulaString = (paso.formula || '').toLowerCase()
            const isMultipliedByQty = formulaString.includes('cantidad')
            if (isMultipliedByQty && cantidadConvertida > 0) {
              precioUnitBase = valorFinal / cantidadConvertida
              subtotalBruto = valorFinal
            } else {
              precioUnitBase = valorFinal
              subtotalBruto = cantidadConvertida * precioUnitBase
            }
          }
        } else if (paso.tipo === 'Impuesto') {
          totalImpuesto += valorFinal
        } else if (paso.tipo === 'Subtotal') {
          subtotalBruto = valorFinal
        } else if (paso.tipo === 'Descuento') {
          const descripcionLower = paso.descripcion_corta.toLowerCase()
          const isPromocion = descripcionLower.includes('promocion') || descripcionLower.includes('promoción')
          const isCupon = descripcionLower.includes('cupon') || descripcionLower.includes('cupón')
          if (isPromocion) {
            const qtyForPromo = cantidadTotalGrupo || cantidadConvertida
            if (promoAplicada && promocionId && promocionCantidadCompra && promocionCantidadRegalo && qtyForPromo >= promocionCantidadCompra) {
              const precioEfectivo = precioUnitBase - descuentosUnitarios - descuentoCuponUnitarioAcumulado
              const unidadesGratisTotal = Math.floor(qtyForPromo / promocionCantidadCompra) * promocionCantidadRegalo
              valorFinal = precioEfectivo * unidadesGratisTotal
              descuentoPromocion += valorFinal
              totalDescuento += valorFinal
              subtotalBruto = subtotalBruto - valorFinal
            } else {
              valorFinal = 0
            }
          } else if (isCupon) {
            if (lineaData.aplica_cupon) {
              if (condicionEncontrada && valorBase > 0) {
                const descuentoUnitario = esporcentaje ? precioUnitBase * (valorBase / 100) : valorBase
                descuentoCuponCalc = descuentoUnitario * cantidadConvertida
                totalDescuento += descuentoCuponCalc
                subtotalBruto -= descuentoCuponCalc
                descuentoCuponUnitarioAcumulado = descuentoUnitario
                lineaData.descuento_cupon_unitario = descuentoUnitario
                lineaData.descuento_cupon = descuentoCuponCalc
                valorFinal = descuentoCuponCalc
              } else {
                descuentoCuponCalc = descuentoCuponUnitario * cantidadConvertida
                totalDescuento += descuentoCuponCalc
                subtotalBruto -= descuentoCuponCalc
                descuentoCuponUnitarioAcumulado = descuentoCuponUnitario
                valorFinal = descuentoCuponCalc
              }
            } else {
              descuentoCuponUnitarioAcumulado = 0
              valorFinal = 0
            }
          } else {
            totalDescuento += valorFinal
            if (cantidadConvertida > 0) {
              descuentosUnitarios += valorFinal / cantidadConvertida
            }
            subtotalBruto = subtotalBruto - valorFinal
          }
        }
        results[paso.secuencia_paso.toString()] = valorFinal
        return {
          condicion_id: paso.condicion_id,
          esquema_id: paso.esquema_id,
          valor: valorFinal,
          codigo: paso.tipo,
          descripcion: paso.descripcion_corta,
          valor_original: paso.condicion_id && results[paso.secuencia_paso.toString()] !== undefined ? valorBase : undefined,
          es_porcentaje: esporcentaje,
        }
      })
      const taxCalculados: VentaDetalleCondicion[] = taxPasos.map(paso => {
        let valorBase = 0
        let esporcentaje = false
        let condicionEncontrada = false
        if (paso.condicion_id) {
          const condicionEspecifica = todasCondiciones.find((c: any) => Number(c.tipo_condicion_id) === Number(paso.condicion_id) && Number(c.material_id) === Number(materialId))
          const condicionGeneral = todasCondiciones.find((c: any) => Number(c.tipo_condicion_id) === Number(paso.condicion_id) && (c.material_id === null || c.material_id === undefined))
          const condicion = condicionEspecifica || condicionGeneral
          if (condicion) {
            condicionEncontrada = true
            valorBase = parseFloat(condicion.valor) || 0
            esporcentaje = condicion.porcentaje === true
          } else {
            const isCuponStep = paso.descripcion_corta.toLowerCase().includes('cupon') || paso.descripcion_corta.toLowerCase().includes('cupón')
            if (isCuponStep && globalCupon) {
              condicionEncontrada = true
              valorBase = globalCupon.valor
              esporcentaje = globalCupon.tipo === 'PORCENTAJE'
            } else {
              valorBase = 0
              esporcentaje = true
            }
          }
        } else {
          if (paso.tipo === 'Impuesto') {
            valorBase = 0
            esporcentaje = true
          }
        }
        let valorFinal = 0
        try {
          let formula = (paso.formula || '1').toLowerCase().trim()
          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)
          const stepSlug = paso.descripcion_corta.toLowerCase().trim().replace(/\s+/g, '_')
          const stepName = paso.descripcion_corta.toLowerCase().trim()
          const filteredVarContext: Record<string, number> = {}
          Object.keys(varContext).forEach(k => {
            const stepSlugLower = stepSlug.toLowerCase()
            const stepNameLower = stepName.toLowerCase()
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
            ...(stepSlug.includes('_') ? { [stepSlug.split('_').pop()!]: valorBase } : {}),
          }
          formula = formula.replace(/\bs([0-9]+)\b/g, (match, num) => (results[num] || 0).toString())
          Object.keys(evalContext)
            .sort((a, b) => b.length - a.length)
            .forEach(vName => {
              const regex = new RegExp(`\\b${vName}\\b`, 'gi')
              formula = formula.replace(regex, evalContext[vName].toString())
            })
          if (paso.condicion_id && !condicionEncontrada) {
            valorFinal = 0
          } else if (formula === '1' || formula === '') {
            valorFinal = esporcentaje ? baseCalculo * (valorBase / 100) : valorBase
          } else {
            // eslint-disable-next-line no-eval
            valorFinal = eval(formula) || 0
          }
        } catch (e) {
          console.error('Error evaluating formula for tax step:', paso.descripcion_corta, e)
          valorFinal = 0
        }
        if (paso.tipo === 'Impuesto') {
          totalImpuesto += valorFinal
        }
        results[paso.secuencia_paso.toString()] = valorFinal
        return {
          condicion_id: paso.condicion_id,
          esquema_id: paso.esquema_id,
          valor: valorFinal,
          codigo: paso.tipo,
          descripcion: paso.descripcion_corta,
          valor_original: paso.condicion_id && results[paso.secuencia_paso.toString()] !== undefined ? valorBase : undefined,
          es_porcentaje: esporcentaje,
        }
      })
      const pasosCalculados: VentaDetalleCondicion[] = [...nonTaxCalculados, ...taxCalculados].sort((a, b) => {
        const aPaso = activePasos.find(p => p.descripcion_corta === a.descripcion)
        const bPaso = activePasos.find(p => p.descripcion_corta === b.descripcion)
        return (aPaso?.secuencia_paso || 0) - (bPaso?.secuencia_paso || 0)
      })
      setLineas(prev => {
        const next = [...prev]
        if (next[index]) {
          const l: VentaDetalle = {
            ...next[index],
            ...lineaData,
            pasos_calculados: pasosCalculados,
            cantidad,
            precio_unit: precioUnitBase,
            descuento: totalDescuento - descuentoPromocion - descuentoCuponCalc,
            descuento_cupon: descuentoCuponCalc,
            descuento_cupon_unitario: descuentoCuponUnitario,
            descuento_promocion: descuentoPromocion,
            impuesto: totalImpuesto,
            subtotal: subtotalBruto,
          }
          next[index] = l
        }
        return next
      })
    } catch (error) {
      console.error('Error in calculateLineCalculations:', error)
    }
  }

  const checkPromocion = async (
    index: number,
    materialId: number,
    categoriaId: number | null | undefined,
    lineaData?: VentaDetalle,
    updatedLines?: VentaDetalle[]
  ) => {
    if (!materialId) return
    try {
      const fechaParam = fechaVenta || localToday()
      const sourceLines = updatedLines || lineas
      const allMaterialIds = sourceLines
        .filter(l => l.material_id && l.material_id !== materialId)
        .map(l => l.material_id!)
      allMaterialIds.push(materialId)
      const res = await apiFetch(`/api/pos/promociones?materialIds=${allMaterialIds.join(',')}&fecha=${fechaParam}`)
      if (!res.ok) return
      const json = await res.json()
      const promos: Array<{ id: number; nombre: string; cantidad_compra: number; cantidad_regalo: number; material_ids: number[]; categoria_ids: number[] }> = json.data || []
      const currentLinea = lineaData || sourceLines[index]
      if (!currentLinea) return
      const promoGroups = new Map<number, { promo: (typeof promos)[0]; materialIds: number[] }>()
      promos.forEach(promo => {
        if (!promoGroups.has(promo.id)) {
          promoGroups.set(promo.id, { promo, materialIds: [] })
        }
        promo.material_ids.forEach(mid => {
          const group = promoGroups.get(promo.id)!
          if (!group.materialIds.includes(mid)) {
            group.materialIds.push(mid)
          }
        })
        promo.categoria_ids.forEach(cid => {
          const grp = promoGroups.get(promo.id)!
          sourceLines.forEach(l => {
            if (l.categoria_id === cid && l.material_id && !grp.materialIds.includes(l.material_id)) {
              grp.materialIds.push(l.material_id)
            }
          })
        })
      })
      let encontrada: (typeof promos)[0] | undefined
      let promoGroup: { promo: (typeof promos)[0]; materialIds: number[] } | undefined
      for (const [, group] of promoGroups) {
        if (group.materialIds.includes(materialId)) {
          encontrada = group.promo
          promoGroup = group
          break
        }
      }
      const promoLabel = encontrada ? encontrada.nombre : null
      const promoBadge = encontrada ? `${encontrada.cantidad_compra}x${encontrada.cantidad_regalo}` : null
      let cantidadTotalGrupo = 0
      if (promoGroup) {
        sourceLines.forEach(l => {
          if (l.material_id && promoGroup!.materialIds.includes(l.material_id)) {
            const um = l.unidad_multiplo || 1
            cantidadTotalGrupo += (l.cantidad || 0) * um
          }
        })
      }
      let chosenLineIndex = -1
      let minPrecio = Infinity
      if (promoGroup) {
        sourceLines.forEach((l, idx) => {
          if (l.material_id && promoGroup!.materialIds.includes(l.material_id)) {
            const precio = l.precio_unit || 0
            if (precio > 0 && precio < minPrecio) {
              minPrecio = precio
              chosenLineIndex = idx
            }
          }
        })
      }
      const recalculatePromoGroup = (linesToUpdate: VentaDetalle[]) => {
        if (!promoGroup || !encontrada || cantidadTotalGrupo === 0) return linesToUpdate
        return linesToUpdate.map((l, idx) => {
          if (l.material_id && promoGroup.materialIds.includes(l.material_id)) {
            const base = {
              ...l,
              promocion_id: encontrada!.id,
              promocion_label: promoLabel,
              promocion_badge: promoBadge,
              promocion_cantidad_compra: encontrada!.cantidad_compra,
              promocion_cantidad_regalo: encontrada!.cantidad_regalo,
              cantidad_total_grupo: cantidadTotalGrupo,
            }
            if (idx === chosenLineIndex) {
              return { ...base, promo_aplicada: true }
            } else {
              return { ...base, promo_aplicada: false }
            }
          }
          return l
        })
      }
      const updatedLinea: VentaDetalle = {
        ...currentLinea,
        promocion_id: encontrada?.id ?? null,
        promocion_label: promoLabel,
        promocion_badge: promoBadge,
        promocion_cantidad_compra: encontrada?.cantidad_compra ?? null,
        promocion_cantidad_regalo: encontrada?.cantidad_regalo ?? null,
        cantidad_total_grupo: cantidadTotalGrupo,
      }
      const linesToUpdate = updatedLines || lineas
      let updatedLinesFinal = linesToUpdate
      if (promoGroup) {
        updatedLinesFinal = recalculatePromoGroup(linesToUpdate)
      } else {
        updatedLinesFinal = linesToUpdate.map((l, i) => (i === index ? updatedLinea : l))
      }
      setLineas(updatedLinesFinal)
      if (promoGroup) {
        updatedLinesFinal.forEach((l, i) => {
          if (l.material_id && promoGroup!.materialIds.includes(l.material_id) && pasosEsquema.length > 0) {
            calculateLineCalculations(i, l.material_id, l.cantidad, l, undefined, undefined, cuponAplicadoGlobal)
          }
        })
      } else if (updatedLinea.material_id && pasosEsquema.length > 0) {
        calculateLineCalculations(index, updatedLinea.material_id, updatedLinea.cantidad, updatedLinea, undefined, undefined, cuponAplicadoGlobal)
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
      aplica_cupon: false,
    }
    if (cuponAplicadoGlobal) {
      const qualifies = await checkMaterialQualifiesForCupon(cuponAplicadoGlobal, material.id, material.categoria_id ?? null)
      if (qualifies) {
        newLineas[index].aplica_cupon = true
        setMaterialesConCupon(prev => ({ ...prev, [newLineas[index].id]: true }))
      }
    }
    setLineas(newLineas)
    if (sucursal?.id && currentLinea.almacen_id && umId && clasePedido?.estado_stock_id) {
      fetchStock(index, material.id, currentLinea.almacen_id, sucursal.id, material.unidad_medida_id || umId, clasePedido.estado_stock_id)
    }
    checkPromocion(index, material.id, material.categoria_id ?? null, newLineas[index], newLineas)
  }

  const handleAlmacenSelect = (index: number, almacen: any) => {
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]
    newLineas[index] = { ...currentLinea, almacen_id: almacen.id, almacen_descripcion: almacen.descripcion, stock: null }
    setLineas(newLineas)
    if (sucursal?.id && currentLinea.material_id && currentLinea.unidad_medida_stock_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, almacen.id, sucursal.id, currentLinea.unidad_medida_stock_id, clasePedido.estado_stock_id)
    }
  }

  const handleUnidadChange = async (index: number, umId: number | undefined, abreviatura?: string) => {
    if (!umId) return
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]
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
    newLineas[index] = { ...currentLinea, unidad_medida_id: umId, um: abreviatura || currentLinea.um, unidad_multiplo: unidadMultiplo, stock: null }
    setLineas(newLineas)
    if (sucursal?.id && currentLinea.material_id && currentLinea.almacen_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, currentLinea.almacen_id, sucursal.id, currentLinea.unidad_medida_stock_id, clasePedido.estado_stock_id)
    }
  }

  const handleLineaChange = (index: number, field: keyof VentaDetalle, value: any) => {
    const newLineas = [...lineas]
    const l = { ...newLineas[index], [field]: value }
    newLineas[index] = l
    setLineas(newLineas)
    if (field === 'cantidad' || field === 'precio_unit' || field === 'descuento') {
      if (l.material_id && pasosEsquema.length > 0) {
        if ((field === 'cantidad' || field === 'precio_unit') && l.material_id) {
          checkPromocion(index, l.material_id, l.categoria_id, l, newLineas)
        } else {
          calculateLineCalculations(index, l.material_id, l.cantidad, l, undefined, undefined, cuponAplicadoGlobal)
        }
      } else {
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
    if (!numeroIdentificacion || !docIdentificacion) return
    if (consultandoAPIRef.current) return
    if (consultadoRef.current) return
    consultandoAPIRef.current = true
    try {
      const res = await apiFetch(`/api/clientes?search=${numeroIdentificacion}&pageSize=50`)
      if (res.ok) {
        const body = await res.json()
        const match = body.data?.find((c: any) => c.nif?.toString()?.toLowerCase() === numeroIdentificacion.toLowerCase())
        if (match) {
          consultadoRef.current = true
          consultandoAPIRef.current = false
          setEsNuevoCliente(false)
          setCliente(match)
          setNombre(match.nombre || '')
          setNombresCompletos(match.nombres_completos || '')
          setApellidosCompletos(match.apellidos_completos || '')
          setDireccion(match.direccion || '')
          setUbigeo(match.ubigeo || '')
          setDepartamento(match.departamento || '')
          setProvincia(match.provincia || '')
          setDistrito(match.distrito || '')
          setShowClientForm(false)
          toast.success('Cliente encontrado y cargado')
          return
        }
      }
      setEsNuevoCliente(true)
      setConsultandoAPI(true)
      try {
        const apiRes = await apiFetch('/api/factiliza/consultar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero: numeroIdentificacion, documentoIdentificacionId: docIdentificacion.id }),
        })
        if (apiRes.ok) {
          const json = await apiRes.json()
          const data = json.data
          if (data) {
            consultadoRef.current = true
            if (docIdentificacion.abreviatura === 'RUC') {
              setNombre(data.nombre_o_razon_social || '')
              setNombresCompletos('')
              setApellidosCompletos('')
            } else {
              setNombresCompletos(data.nombres || '')
              setApellidosCompletos(`${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim())
              setNombre(data.nombre_completo || '')
            }
            setDireccion(data.direccion || '')
            setUbigeo(data.ubigeo_sunat || '')
            setDepartamento(data.departamento || '')
            setProvincia(data.provincia || '')
            setDistrito(data.distrito || '')
            setShowClientForm(false)
            toast.success('Datos cargados desde Factiliza')
          }
        } else {
          toast.error('Cliente no encontrado. Complete los datos manualmente.')
        }
      } catch (error) {
        console.error('Error consultando API externa:', error)
        toast.error('Error al consultar servicio externo.')
      } finally {
        consultandoAPIRef.current = false
        setConsultandoAPI(false)
      }
    } catch (error) {
      consultandoAPIRef.current = false
      console.error('Error buscando cliente:', error)
    }
  }

  const buildPayload = (estado: string) => {
    const nombreCompleto = (nombresCompletos && apellidosCompletos) ? `${nombresCompletos} ${apellidosCompletos}`.trim() : nombre
    return {
      numero_pedido: `PED-${Date.now().toString().slice(-6)}`,
      comprobante,
      fecha_venta: parseLocalNoon(fechaVenta).toISOString(),
      cliente_id: cliente?.id || null,
      documento_identificacion_id: docIdentificacion?.id || null,
      numero_identificacion: numeroIdentificacion || null,
      nombre: nombreCompleto || 'Consumidor Final',
      nombres_completos: nombresCompletos || null,
      apellidos_completos: apellidosCompletos || null,
      direccion: direccion || null,
      ubigeo: ubigeo || null,
      departamento: departamento || null,
      provincia: provincia || null,
      distrito: distrito || null,
      sucursal_id: sucursal?.id || null,
      clase_pedido_id: clasePedido?.id || null,
      moneda_id: monedaId,
      estado,
      motivo,
      hora_venta: horaVenta,
      fecha_regularizacion: new Date().toISOString(),
      referencia: referencia || null,
      justificacion,
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      descuento_cupon: totals.descuento_cupon,
      descuento_promocion: totals.descuento_promocion,
      impuesto: totals.impuesto,
      total: totals.total,
      observaciones: justificacion,
      medios_pago: pagos
        .filter(p => p.medio_pago_id && Number(p.importe) > 0)
        .map(p => ({
          medio_pago_id: p.medio_pago_id,
          importe: Number(p.importe),
          numero_operacion: p.referencia || null
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
          simbolo: p.es_porcentaje ? '%' : monedaSimbolo || '$',
          descripcion_corta: p.descripcion,
          tipo: p.codigo,
        })),
      })),
    }
  }

  const handleSave = async (estado: string = 'procesada') => {
    if (!motivo) return toast.error('Debe seleccionar un motivo de regularización')
    if (!fechaVenta) return toast.error('Debe ingresar la fecha de venta')
    if (!clasePedido) return toast.error('Debe seleccionar una clase de pedido')
    if (lineas.length === 0) return toast.error('Debe agregar al menos un producto')
    const invalidLine = lineas.find(l => !l.material_id || !l.almacen_id || !l.unidad_medida_id)
    if (invalidLine) return toast.error('Debe completar material, almacén y unidad para todos los productos')
    if (!pagos.some(p => p.medio_pago_id && Number(p.importe) > 0)) return toast.error('Debe ingresar al menos un medio de pago con importe')
    const sumaPagos = pagos
      .filter(p => p.medio_pago_id && Number(p.importe) > 0)
      .reduce((acc, p) => acc + Number(p.importe), 0)
    if (sumaPagos > totals.total) return toast.error('La suma de los pagos no puede superar el total')
    if (Math.abs(sumaPagos - totals.total) > 0.01) return toast.error('La suma de los medios de pago debe coincidir con el total')
    if (justificacion.length < 20) return toast.error('La justificación debe tener al menos 20 caracteres')
    if (clasePedido.registro_caja) {
      if (!monedaId) return toast.error('Debe seleccionar una moneda para validar la caja')
      const activeSession = await checkActiveCashSession(sucursal!.id, monedaId)
      if (!activeSession) {
        return toast.error('No se encontró una caja aperturada para esta sucursal y moneda.')
      }
    }
    setLoading(true)
    try {
      const payload = buildPayload(estado)
      let res
      if (editandoId) {
        res = await apiFetch(`/api/ventas?id=${editandoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, accion: 'guardar' })
        })
        if (!res.ok) throw new Error('Error al actualizar el borrador')
      } else {
        res = await apiFetch('/api/ventas', { method: 'POST', body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('Error al registrar la regularización')
      }
      toast.success(editandoId ? 'Borrador actualizado correctamente' : estado === 'borrador' ? 'Borrador guardado correctamente' : 'Regularización registrada correctamente')
      router.push('/ventas')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [showProductModal, setShowProductModal] = useState(false)
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [modalMaterial, setModalMaterial] = useState<any>(null)
  const [modalAlmacenId, setModalAlmacenId] = useState<number | null>(null)
  const [modalAlmacenLabel, setModalAlmacenLabel] = useState('')
  const [modalUnidadId, setModalUnidadId] = useState<number | null>(null)
  const [modalUnidadLabel, setModalUnidadLabel] = useState('UND')
  const [modalCantidad, setModalCantidad] = useState(1)
  const [modalPrecio, setModalPrecio] = useState(0)
  const [modalUnitMultiplo, setModalUnitMultiplo] = useState(1)

  const openAddProductModal = () => {
    setEditingLineIndex(null)
    setModalMaterial(null)
    setModalAlmacenId(null)
    setModalAlmacenLabel('')
    setModalUnidadId(null)
    setModalUnidadLabel('UND')
    setModalCantidad(1)
    setModalPrecio(0)
    setModalUnitMultiplo(1)
    setShowProductModal(true)
  }

  const openEditProductModal = (index: number) => {
    const linea = lineas[index]
    setEditingLineIndex(index)
    setModalMaterial({ id: linea.material_id, codigo: linea.material_codigo, descripcion: linea.material_descripcion })
    setModalAlmacenId(linea.almacen_id || null)
    setModalAlmacenLabel(linea.almacen_descripcion || '')
    setModalUnidadId(linea.unidad_medida_id || null)
    setModalUnidadLabel(linea.um || 'UND')
    setModalCantidad(linea.cantidad)
    setModalPrecio(linea.precio_unit)
    setModalUnitMultiplo(linea.unidad_multiplo || 1)
    setShowProductModal(true)
  }

  const handleConfirmProductModal = async () => {
    if (!modalMaterial) return toast.error('Seleccione un producto')
    if (!modalAlmacenId) return toast.error('Seleccione un almacén')
    if (modalCantidad <= 0) return toast.error('La cantidad debe ser mayor a 0')

    if (editingLineIndex !== null) {
      const newLineas = [...lineas]
      newLineas[editingLineIndex] = {
        ...newLineas[editingLineIndex],
        material_id: modalMaterial.id,
        material_codigo: modalMaterial.codigo,
        material_descripcion: modalMaterial.descripcion,
        almacen_id: modalAlmacenId,
        almacen_descripcion: modalAlmacenLabel,
        unidad_medida_id: modalUnidadId || 0,
        um: modalUnidadLabel,
        unidad_multiplo: modalUnitMultiplo,
        cantidad: modalCantidad,
        precio_unit: modalPrecio,
      }
      setLineas(newLineas)
      const l = newLineas[editingLineIndex]
      if (l.material_id && pasosEsquema.length > 0) {
        checkPromocion(editingLineIndex, l.material_id, l.categoria_id, l, newLineas)
      }
    } else {
      const id = Math.random().toString(36).substring(2, 11)
      const newLinea: VentaDetalle = {
        id,
        material_id: modalMaterial.id,
        material_codigo: modalMaterial.codigo,
        material_descripcion: modalMaterial.descripcion,
        almacen_id: modalAlmacenId,
        almacen_descripcion: modalAlmacenLabel,
        unidad_medida_id: modalUnidadId || 0,
        unidad_medida_stock_id: 0,
        um: modalUnidadLabel,
        um_stock: 'UND',
        unidad_multiplo: modalUnitMultiplo,
        cantidad: modalCantidad,
        precio_unit: modalPrecio,
        descuento: 0,
        descuento_cupon: 0,
        descuento_cupon_unitario: 0,
        descuento_promocion: 0,
        impuesto: 0,
        subtotal: 0,
        stock: null,
        aplica_cupon: false,
      }
      const newLineas = [...lineas, newLinea]
      setLineas(newLineas)
      const newIndex = newLineas.length - 1
      if (pasosEsquema.length > 0) {
        checkPromocion(newIndex, newLinea.material_id, null, newLinea, newLineas)
      }
    }
    setShowProductModal(false)
  }

  const clienteDisplay = useMemo(() => {
    if (cliente?.nombre) return cliente.nombre
    if (nombre) return nombre
    if (nombresCompletos || apellidosCompletos) return `${nombresCompletos} ${apellidosCompletos}`.trim()
    return 'Consumidor final'
  }, [cliente, nombre, nombresCompletos, apellidosCompletos])

  const clienteHasData = !!(cliente?.nombre || nombre || nombresCompletos)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-background-dark">
      <Topbar title="Regularización de Ventas" />

      {/* ─── Body: Form + Summary ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Scrollable form */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ── S1: Información de la regularización ── */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-5">
                Información de la regularización
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Motivo *</label>
                  <select
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none transition-all"
                  >
                    {MOTIVO_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de venta *</label>
                    <input
                      type="date"
                      value={fechaVenta}
                      onChange={e => setFechaVenta(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora de venta</label>
                    <input
                      type="time"
                      value={horaVenta}
                      readOnly
                      className="w-full h-11 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de regularización</label>
                    <div className="w-full h-11 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center cursor-not-allowed">
                      {fechaRegularizacion}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Referencia de operación</label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                    placeholder="N.º comprobante, orden, etc."
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clase de pedido *</label>
                    <ClasePedidoSelect
                      selectedLabel={clasePedido?.descripcion}
                      onSelect={async c => {
                        setClasePedido({ id: c.id, descripcion: c.descripcion, estado_stock_id: c.estado_stock_id, registro_caja: c.registro_caja, concepto_caja_id: c.concepto_caja_id })
                        if (c.registro_caja && sucursal?.id && monedaId) {
                          const session = await checkActiveCashSession(sucursal.id, monedaId)
                          if (!session) {
                            toast.error('Esta clase de pedido requiere caja, pero no hay sesión aperturada.')
                          }
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Moneda</label>
                    <MonedaSelect
                      value={monedaId || undefined}
                      onChange={m => {
                        if (m) {
                          setMonedaId(m.id)
                          setMonedaSimbolo(m.simbolo)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── S2: Cliente ── */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Cliente</h2>
                <button
                  onClick={() => {
                    if (showClientForm) {
                      setShowClientForm(false)
                    } else {
                      setCliente(null)
                      setNombre('')
                      setNombresCompletos('')
                      setApellidosCompletos('')
                      setDocIdentificacion(null)
                      setNumeroIdentificacion('')
                      setDireccion('')
                      setUbigeo('')
                      setDepartamento('')
                      setProvincia('')
                      setDistrito('')
                      consultadoRef.current = false
                      setShowClientForm(true)
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 uppercase tracking-wider transition-colors"
                >
                  {showClientForm ? 'Cerrar' : 'Cambiar'}
                </button>
              </div>

              {!showClientForm ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-lg">
                      {clienteHasData ? 'business' : 'person'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{clienteDisplay}</p>
                    {cliente?.nif && (
                      <p className="text-[10px] text-slate-400">{docIdentificacion?.abreviatura || 'DOC'}: {cliente.nif}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">TIPO DOC.</label>
                      <DocumentoIdentificacionSelect
                        value={docIdentificacion?.id}
                        onSelect={d => setDocIdentificacion({ id: d.id, abreviatura: d.abreviatura })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">NÚMERO DOC.</label>
                      <input
                        type="text"
                        value={numeroIdentificacion}
                        onBlur={handleNumeroDocBlur}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                        onChange={e => { consultadoRef.current = false; setNumeroIdentificacion(e.target.value) }}
                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                      />
                      {consultandoAPI && (
                        <span className="text-[10px] text-blue-600 font-bold mt-1 block">Consultando Factiliza...</span>
                      )}
                    </div>
                  </div>
                  {docIdentificacion?.abreviatura === 'RUC' ? (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">RAZÓN SOCIAL</label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">NOMBRES</label>
                        <input
                          type="text"
                          value={nombresCompletos}
                          onChange={e => setNombresCompletos(e.target.value)}
                          className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">APELLIDOS</label>
                        <input
                          type="text"
                          value={apellidosCompletos}
                          onChange={e => setApellidosCompletos(e.target.value)}
                          className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">DIRECCIÓN</label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={e => setDireccion(e.target.value)}
                      className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* ── S3: Detalle de Productos ── */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                  Detalle de Productos
                </h2>
                <div className="flex items-center gap-3">
                  {cuponesActivos.length > 0 && !cuponAplicadoGlobal && lineas.filter(l => l.material_id).length > 0 && (
                    <select
                      value=""
                      onChange={async e => {
                        const cuponId = Number(e.target.value)
                        if (cuponId) {
                          const cupon = cuponesActivos.find(c => c.id === cuponId)
                          if (cupon) await aplicarCuponGlobal(cupon)
                        }
                      }}
                      className="h-9 px-3 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                    >
                      <option value="">+ Aplicar cupón</option>
                      {cuponesActivos.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.tipo === 'PORCENTAJE' ? `${c.valor}%` : `${monedaSimbolo}${c.valor}`})</option>
                      ))}
                    </select>
                  )}
                  {cuponAplicadoGlobal && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/15 border border-green-300 dark:border-green-500/30 text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider">
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>local_offer</span>
                      {cuponAplicadoGlobal.nombre}
                      <button onClick={() => eliminarCuponGlobal()} className="ml-0.5 hover:bg-green-200 dark:hover:bg-green-500/30 rounded-full p-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>close</span>
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {lineas.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                        <th className="text-center py-3 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">Unidad</th>
                        <th className="text-center py-3 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">Cantidad</th>
                        <th className="text-right py-3 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">P. Unit.</th>
                        <th className="text-right py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Total</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((linea, index) => (
                        <tr key={linea.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                {linea.material_descripcion || <span className="text-slate-400 italic font-normal">Sin producto</span>}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {linea.material_codigo && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {linea.material_codigo}
                                  </span>
                                )}
                                {linea.almacen_descripcion && (
                                  <span className="text-[9px] text-slate-400">
                                    Alm: {linea.almacen_descripcion}
                                  </span>
                                )}
                                {linea.promocion_badge && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-[7px] font-black text-amber-700 dark:text-amber-400 uppercase">
                                    <span className="material-symbols-outlined" style={{ fontSize: '8px' }}>local_offer</span>
                                    {linea.promocion_badge}
                                  </span>
                                )}
                                {linea.aplica_cupon && linea.cupon_codigo && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-blue-100 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/30 text-[7px] font-black text-blue-700 dark:text-blue-400 uppercase">
                                    {linea.cupon_codigo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{linea.um}</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{linea.cantidad}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {mounted ? formatCurrency(linea.precio_unit, { symbol: monedaSimbolo }) : '...'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {mounted ? formatCurrency(linea.subtotal, { symbol: monedaSimbolo }) : '...'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditProductModal(index)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button
                                onClick={() => removeLinea(index)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 block mb-3">receipt_long</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sin productos agregados</p>
                </div>
              )}

              <button
                type="button"
                onClick={openAddProductModal}
                className="mt-4 w-full h-11 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar producto
              </button>
            </section>

            {/* ── S4: Pago y Sustento ── */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-5">
                Pago y Sustento
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Medios de pago *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {mediosPagoOptions
                        .filter((mp: any) => mp.activo !== false || pagos.some(p => p.medio_pago_id === mp.id))
                        .map((mp: any) => {
                        const pago = pagos.find(p => p.medio_pago_id === mp.id)
                        const activo = !!pago
                        return (
                          <button
                            type="button"
                            key={mp.id}
                            onClick={() => {
                              if (activo) {
                                setPagos(prev => prev.filter(p => p.medio_pago_id !== mp.id))
                              } else {
                                setPagos(prev => [...prev, { medio_pago_id: mp.id, importe: '', referencia: '' }])
                              }
                            }}
                            className={cn(
                              "text-left rounded-xl border-2 p-3 transition-all",
                              activo
                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                activo ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600"
                              )}>
                                {activo && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider",
                                activo ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"
                              )}>
                                {mp.descripcion}
                              </span>
                            </div>
                            {activo && (
                              <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{monedaSimbolo}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pago.importe}
                                    onChange={e => setPagos(prev => prev.map(p => p.medio_pago_id === mp.id ? { ...p, importe: e.target.value } : p))}
                                    placeholder="0.00"
                                    className="w-full h-10 pl-8 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={pago.referencia}
                                  onChange={e => setPagos(prev => prev.map(p => p.medio_pago_id === mp.id ? { ...p, referencia: e.target.value } : p))}
                                  placeholder="N.º operación / tarjeta"
                                  className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                                />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total asignado</span>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {mounted
                          ? formatCurrency(
                              pagos.filter(p => p.medio_pago_id && Number(p.importe) > 0).reduce((acc, p) => acc + Number(p.importe), 0),
                              { symbol: monedaSimbolo }
                            )
                          : '...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── S5: Justificación ── */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-2">
                Justificación de la regularización *
              </h2>
              <textarea
                rows={3}
                value={justificacion}
                onChange={e => setJustificacion(e.target.value)}
                placeholder="Describe el motivo por el cual se realiza esta regularización fuera del proceso habitual..."
                className={cn(
                  "w-full p-4 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-blue-500 outline-none resize-none transition-all",
                  justificacion.length > 0 && justificacion.length < 20
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-800"
                )}
              />
              <div className="flex items-center justify-between mt-1.5 ml-1">
                <span className={cn(
                  "text-[10px] font-medium",
                  justificacion.length < 20 ? "text-red-500" : "text-green-600 dark:text-green-400"
                )}>
                  {justificacion.length < 20
                    ? `Mínimo 20 caracteres (${justificacion.length}/20)`
                    : `${justificacion.length} caracteres`}
                </span>
              </div>
            </section>

          </div>
        </div>

        {/* Right: Sticky Summary */}
        <aside className="w-[300px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar hidden lg:block">
          <div className="sticky top-0 p-6">
            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-5">Resumen</h3>

            <div className="space-y-4">
              {/* Product count */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Productos</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lineas.filter(l => l.material_id).length}
                </span>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {mounted ? formatCurrency(totals.subtotal, { symbol: monedaSimbolo }) : '...'}
                </span>
              </div>

              {/* Descuento */}
              {(totals.descuento + totals.descuento_cupon + totals.descuento_promocion) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Descuento</span>
                  <span className="text-sm font-bold text-red-600">
                    -{mounted ? formatCurrency(totals.descuento + totals.descuento_cupon + totals.descuento_promocion, { symbol: monedaSimbolo }) : '...'}
                  </span>
                </div>
              )}

              {/* IGV */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">IGV</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {mounted ? formatCurrency(totals.impuesto, { symbol: monedaSimbolo }) : '...'}
                </span>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-700" />

              {/* TOTAL */}
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {mounted ? formatCurrency(totals.total, { symbol: monedaSimbolo }) : '...'}
                </span>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Regularización warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5">warning</span>
                <div>
                  <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Regularización</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                    Esta operación generará los movimientos correspondientes en ventas e inventario.
                  </p>
                </div>
              </div>

              {/* Client info */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right max-w-[150px] truncate">
                  {clienteDisplay}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de venta</span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {fechaVenta} {horaVenta}
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>

      {/* ─── Footer Actions ─── */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/ventas')}
            className="px-6 h-11 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave('borrador')}
              disabled={loading}
              className="px-6 h-11 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50 active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              Guardar borrador
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={loading || lineas.length === 0}
              className="px-8 h-11 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Registrar regularización
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Product Modal ─── */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProductModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {editingLineIndex !== null ? 'Editar producto' : 'Agregar producto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Buscar producto / código</label>
                <MaterialSelect
                  selectedLabel={modalMaterial?.descripcion}
                  monedaId={monedaId}
                  onSelect={(m) => {
                    setModalMaterial(m)
                    setModalPrecio(Number(m.precio_venta) || 0)
                    const umId = m.unidad_medida_id || 0
                    setModalUnidadId(umId)
                    setModalUnidadLabel(m.unidad_medida?.abreviatura || 'UND')
                    setModalUnitMultiplo(1)
                  }}
                  placeholder="Escriba código o descripción..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Almacén *</label>
                <AlmacenSelect
                  selectedLabel={modalAlmacenLabel}
                  onSelect={a => {
                    setModalAlmacenId(a.id)
                    setModalAlmacenLabel(a.descripcion)
                  }}
                  sucursalId={sucursal?.id}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidad</label>
                  <UnidadSelect
                    value={modalUnidadId || undefined}
                    onChange={async id => {
                      if (!id) return
                      let multiplo = 1
                      try {
                        const umRes = await apiFetch(`/api/logistica/unidades?id=${id}`)
                        const umJson = await umRes.json()
                        if (umJson.data?.unidad_multiplo) multiplo = Number(umJson.data.unidad_multiplo) || 1
                      } catch {}
                      setModalUnidadId(id)
                      setModalUnitMultiplo(multiplo)
                    }}
                    materialId={modalMaterial?.id}
                    enabled={!!modalMaterial}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cantidad *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalCantidad}
                    onChange={e => setModalCantidad(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Precio unitario</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{monedaSimbolo}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalPrecio}
                    onChange={e => setModalPrecio(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-blue-500 outline-none text-right"
                  />
                </div>
              </div>

              {modalMaterial && modalCantidad > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal línea</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {mounted ? formatCurrency(modalCantidad * modalPrecio * modalUnitMultiplo, { symbol: monedaSimbolo }) : '...'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setShowProductModal(false)}
                className="px-6 h-11 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmProductModal}
                disabled={!modalMaterial || !modalAlmacenId || modalCantidad <= 0}
                className="px-8 h-11 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95"
              >
                {editingLineIndex !== null ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Dialog ─── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <span className="material-symbols-outlined text-[32px]">gpp_maybe</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                Confirmar regularización
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mb-6">
                Se registrará una venta por:
              </p>

              <div className="w-full space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {mounted ? formatCurrency(totals.total, { symbol: monedaSimbolo }) : '...'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de venta</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{fechaVenta}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Productos</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{lineas.filter(l => l.material_id).length}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{clienteDisplay}</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium mb-8">
                Esta operación generará los movimientos correspondientes en el sistema.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDialog(false)
                    handleSave('procesada')
                  }}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-600/20 border border-blue-700 active:scale-95"
                >
                  Confirmar y registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  )
}
