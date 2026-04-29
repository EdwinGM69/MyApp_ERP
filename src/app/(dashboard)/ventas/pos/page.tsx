'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import Badge from '@/components/ui/Badge'
import DocumentoIdentificacionSelect from '@/components/ui/DocumentoIdentificacionSelect'
import { apiFetch, useAuthStore, getAuthStore } from '@/hooks/useAuth'
import { formatCurrency, generateOrderNumber } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useSucursal } from '@/contexts/SucursalContext'

interface Material {
  id: number
  codigo: string
  descripcion: string
  precio_venta: number
  stock_actual: number
  imagen_url?: string
  categoria?: string
  tipo: string
  unidad_medida_id?: number
  impuesto?: { porcentaje: number } | null
  categoria_id?: number | null
}

interface MaterialCategoria {
  id: number
  codigo: string
  descripcion: string
}

interface PromotionData {
  id: number
  nombre: string
  cantidad_compra: number
  cantidad_regalo: number
  material_ids: number[]
  categoria_ids: number[]
}

interface CartItem {
  material: Material
  cantidad: number
  precio_unit: number
  descuento: number
  descuento_cupon?: number
  descuento_promocion?: number
  subtotal: number
  impuesto: number
  almacen_id: number
  unidad_medida_id: number
  pasos_calculados?: Array<{
    condicion_id: number | null
    esquema_id: number | null
    valor: number
    codigo?: string
    descripcion?: string
    valor_original?: number
    es_porcentaje?: boolean
  }>
  promocion_aplicada?: {
    promoId: number
    nombre: string
    cantidad_regalo: number
    valor_descuento: number
  }
}

export default function POSPage() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [cupon, setCupon] = useState('')
  const [descuentoCupon, setDescuentoCupon] = useState(0)
  const [mounted, setMounted] = useState(false)
  const monedaSimbolo = useAuthStore(state => state.user?.monedaSimbolo || '$')
  const { currentSucursal } = useSucursal()

  const [nif, setNif] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [mostrarCliente, setMostrarCliente] = useState(false)
  const [docIdentificacion, setDocIdentificacion] = useState<{ id: number; abreviatura: string } | null>(null)
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('')
  const [clienteNombreFull, setClienteNombreFull] = useState('')
  const [nombresCompletos, setNombresCompletos] = useState('')
  const [apellidosCompletos, setApellidosCompletos] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ubigeo, setUbigeo] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [provincia, setProvincia] = useState('')
  const [distrito, setDistrito] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [promociones, setPromociones] = useState<PromotionData[]>([])
  const [promocionesAplicadas, setPromocionesAplicadas] = useState<Map<number, { promoId: number; nombre: string; cantidad_regalo: number; valor_descuento: number }>>(new Map())
  const [promocionTotal, setPromocionTotal] = useState<{ nombre: string; valor: number; promoId: number; cantidad_regalo: number } | null>(null)
  const [descuentos, setDescuentos] = useState<Map<number, { valor: number; porcentaje: boolean; simbolo: string }>>(new Map())
  const [preciosDinamicos, setPreciosDinamicos] = useState<Map<number, number>>(new Map())
  const [categorias, setCategorias] = useState<MaterialCategoria[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null)
  const [cupones, setCupones] = useState<Array<{ id: number; nombre: string; tipo: string; valor: number; acumulable: boolean; activo: boolean; fecha_inicio: string; fecha_fin: string }>>([])
  const [cuponSimbolo, setCuponSimbolo] = useState<string>('%')
  const [descuentoEsCupon, setDescuentoEsCupon] = useState<boolean>(false)
  const [materialesValidos, setMaterialesValidos] = useState<number[]>([])
  const [mediosPago, setMediosPago] = useState<Array<{ id: number; descripcion: string; activo: boolean; numero_operacion: boolean }>>([])
  const [mediosPagoSeleccionados, setMediosPagoSeleccionados] = useState<Array<{ medioPagoId: number; descripcion: string; monto: number; numeroOperacion: string }>>([])

  // Fetch medios de pago activos
  useEffect(() => {
    const fetchMediosPago = async () => {
      try {
        const res = await apiFetch('/api/tesoreria/medios-pago')
        const json = await res.json()
        if (json.data) {
          setMediosPago(json.data.filter((m: any) => m.activo === true))
        }
      } catch (e) {
        console.error('[POS] Error fetching medios de pago:', e)
      }
    }
    fetchMediosPago()
  }, [])

  // Esquema de cálculo
  const [pasosEsquema, setPasosEsquema] = useState<any[]>([])
  const [condiciones, setCondiciones] = useState<any[]>([])
  const [clasePedidoId, setClasePedidoId] = useState<number | null>(null)
  const [igvPorcentaje, setIgvPorcentaje] = useState<number>(18)

  // Default almacen and moneda from auth/sucursal
  const [defaultAlmacenId, setDefaultAlmacenId] = useState<number>(0)
  const [defaultMonedaId, setDefaultMonedaId] = useState<number | null>(null)

  const fetchMateriales = useCallback(async () => {
    console.log('[POS] fetchMateriales called, search:', search, 'currentSucursal:', currentSucursal, 'categoria:', categoriaSeleccionada)
    if (!currentSucursal) {
      console.log('[POS] No currentSucursal, skipping fetch')
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ search, pageSize: '50', page: '1' })
    const sucursalId = currentSucursal?.id
    console.log('[POS] sucursalId:', sucursalId)
    if (sucursalId) {
      params.set('sucursalId', String(sucursalId))
    }
    if (categoriaSeleccionada !== null) {
      params.set('categoriaId', String(categoriaSeleccionada))
    }
    console.log('[POS] Calling API with params:', params.toString())
    const res = await apiFetch(`/api/materiales?${params}`)
    const json = await res.json()
    console.log('[POS] API response:', json.data?.length, 'materials')
    setMateriales((json.data ?? []).filter((m: Material) => m.stock_actual > 0))
    setLoading(false)
  }, [search, currentSucursal, categoriaSeleccionada])

  // Fetch materiales when mounted or when sucursal becomes available
  useEffect(() => {
    console.log('[POS] useEffect triggered, currentSucursal:', currentSucursal)
    setMounted(true)
    if (currentSucursal) {
      fetchMateriales()
    }
  }, [fetchMateriales, currentSucursal])

  // Fetch precios dinámicos
  const fetchPreciosDinamicos = useCallback(async (materialIds: number[]) => {
    if (materialIds.length === 0 || !currentSucursal) return
    console.log('[POS] fetchPreciosDinamicos called with:', materialIds)
    try {
      const res = await apiFetch(`/api/pos/precios?materialIds=${materialIds.join(',')}`)
      const json = await res.json()
      console.log('[POS] precios response:', json.data)
      if (json.data) {
        const map = new Map<number, number>()
        json.data.forEach((p: any) => map.set(p.materialId, p.precio))
        setPreciosDinamicos(map)
        console.log('[POS] precios map set, size:', map.size)
      }
    } catch (e) {
      console.error('[POS] Error fetching precios:', e)
    }
  }, [currentSucursal])

  // Fetch descuentos
  const fetchDescuentos = useCallback(async (materialIds: number[]) => {
    if (materialIds.length === 0) return
    console.log('[POS] fetchDescuentos called with:', materialIds)
    try {
      const empresaId = getAuthStore().user?.empresaId
      const paramRes = await apiFetch('/api/parametros-sistema?codigo=POS.DCTVENTA')
      const paramJson = await paramRes.json()
      console.log('[POS] POS.DCTVENTA param response:', paramJson.data)

      if (paramJson.data && paramJson.data.length > 0) {
        const param = paramJson.data.find((p: any) =>
          (p.nivel === 'EMPRESA' || p.nivel === 'USUARIO' || p.nivel === 'MODULO' || p.nivel === 'SISTEMA') &&
          (p.empresa_id === empresaId || !p.empresa_id)
        )
        console.log('[POS] Descuento param found:', param)

        if (param) {
          const tipoCondicionCodigo = param.valor_string || 'DCTOVT'
          console.log('[POS] tipoCondicionCodigo:', tipoCondicionCodigo)

          const tipoRes = await apiFetch('/api/tipos-condicion?search=' + tipoCondicionCodigo)
          const tipoJson = await tipoRes.json()
          console.log('[POS] tipos-condicion response:', tipoJson.data)

          const tipoCondicion = tipoJson.data?.find((t: any) => t.codigo === tipoCondicionCodigo)
          const tipoCondicionId = tipoCondicion?.id
          console.log('[POS] tipoCondicionId:', tipoCondicionId)

          if (tipoCondicionId) {
            const res = await apiFetch(`/api/comercial/condiciones?materialIds=${materialIds.join(',')}&tipo_condicion_id=${tipoCondicionId}`)
            const json = await res.json()
            console.log('[POS] condiciones response:', json.data)

            if (json.data) {
              const map = new Map<number, { valor: number; porcentaje: boolean; simbolo: string }>()
              json.data.forEach((c: any) => {
                if (c.material_id) {
                  map.set(c.material_id, {
                    valor: c.valor,
                    porcentaje: c.porcentaje,
                    simbolo: c.moneda?.simbolo || '$'
                  })
                }
              })
              setDescuentos(map)
              console.log('[POS] descuentos map set, size:', map.size)
            }
          }
        }
      }
    } catch (e) {
      console.error('[POS] Error fetching descuentos:', e)
    }
  }, [])

  // Call fetchPromociones and fetchPreciosDinamicos after materiales are loaded
  useEffect(() => {
    console.log('[POS] promociones effect - materiales.length:', materiales.length, 'currentSucursal:', currentSucursal)
    if (materiales.length > 0 && currentSucursal) {
      const ids = materiales.map(m => m.id)
      console.log('[POS] Calling fetchPromociones with:', ids)
      fetchPromociones(ids)
      fetchPreciosDinamicos(ids)
    }
  }, [materiales, currentSucursal])

  // Call fetchDescuentos after materiales are loaded
  useEffect(() => {
    console.log('[POS] descuentos effect - materiales.length:', materiales.length, 'currentSucursal:', currentSucursal)
    if (materiales.length > 0 && currentSucursal) {
      const ids = materiales.map(m => m.id)
      console.log('[POS] Calling fetchDescuentos with:', ids)
      fetchDescuentos(ids)
    }
  }, [materiales, currentSucursal])

  // Fetch promociones when materiales are loaded
  const fetchPromociones = useCallback(async (materialIds: number[]) => {
    if (materialIds.length === 0) return
    console.log('[POS] fetchPromociones called with:', materialIds)
    try {
      const res = await apiFetch(`/api/pos/promociones?materialIds=${materialIds.join(',')}`)
      const json = await res.json()
      console.log('[POS] promociones response:', json.data)
      if (json.data) {
        setPromociones(json.data)
        console.log('[POS] promociones data set, count:', json.data.length)
      }
    } catch (e) {
      console.error('[POS] Error fetching promociones:', e)
    }
  }, [])

  // Call fetchDescuentos after materiales are loaded
  useEffect(() => {
    console.log('[POS] descuentos effect - materiales.length:', materiales.length, 'currentSucursal:', currentSucursal)
    if (materiales.length > 0 && currentSucursal) {
      const ids = materiales.map(m => m.id)
      console.log('[POS] Calling fetchDescuentos with:', ids)
      fetchDescuentos(ids)
    }
  }, [materiales, currentSucursal, fetchDescuentos])

  // Load esquema de cálculo
  const loadEsquemaCalculo = useCallback(async () => {
    console.log('[POS] loadEsquemaCalculo called')
    try {
      const empresaId = getAuthStore().user?.empresaId
      console.log('[POS] empresaId:', empresaId)
      if (!empresaId) { toast.error('No hay empresaId configurado'); return }

      // 1. Get POS.PEDVTA param to find clase_pedido
      const paramRes = await apiFetch('/api/parametros-sistema?codigo=POS.PEDVTA')
      const paramJson = await paramRes.json()
      console.log('[POS] POS.PEDVTA response:', paramJson)

      if (!paramJson.data || paramJson.data.length === 0) {
        console.log('[POS] No se encontró parámetro POS.PEDVTA')
        toast.error('No hay parámetro POS.PEDVTA configurado')
        return
      }

      // Filter specifically by POS.PEDVTA code
      const param = paramJson.data.find((p: any) =>
        p.codigo === 'POS.PEDVTA' &&
        (p.nivel === 'EMPRESA' || p.nivel === 'USUARIO' || p.nivel === 'MODULO' || p.nivel === 'SISTEMA') &&
        (p.empresa_id === empresaId || !p.empresa_id)
      )
      console.log('[POS] param found:', param)

      if (!param) {
        console.log('[POS] No param POS.PEDVTA para empresa')
        toast.error('No hay clase de pedido configurada para esta empresa')
        return
      }

      let clasePedidoCodigo = param.valor_string || param.valor_number || param.valor_boolean
      console.log('[POS] clasePedidoCodigo:', clasePedidoCodigo)

      if (!clasePedidoCodigo) {
        console.log('[POS] No clasePedidoCodigo found in param')
        toast.error('Clase de pedido no configurada')
        return
      }

      // Handle both with and without "POS." prefix
      const searchCodes = typeof clasePedidoCodigo === 'string'
        ? [clasePedidoCodigo, clasePedidoCodigo.replace(/^POS\./, '')]
        : [clasePedidoCodigo]
      console.log('[POS] Search codes:', searchCodes)
      console.log('[POS] Buscando clase_pedido:', searchCodes)

      // 2. Find clase_pedido by codigo
      let clasePedido: any = null
      for (const code of searchCodes) {
        const cpRes = await apiFetch(`/api/comercial/clases-pedido?search=${code}`)
        const cpJson = await cpRes.json()
        console.log(`[POS] clase_pedido search ${code}:`, cpJson)
        if (cpJson.data?.length > 0) {
          clasePedido = cpJson.data[0]
          break
        }
      }

      console.log('[POS] clasePedido found:', clasePedido)
      console.log('[POS] clasePedido.esquema_id:', clasePedido?.esquema_id)

      if (!clasePedido?.esquema_id) {
        console.log('[POS] No esquema_id in clasePedido:', clasePedido)
        toast.error('La clase VTAPOS no tiene esquema_id configurado')
        return
      }

      console.log('[POS] Found esquema_id:', clasePedido.esquema_id)
      // 3. Get esquema de cálculo
      const esRes = await apiFetch(`/api/esquemas-calculo?id=${clasePedido.esquema_id}`)
      const esJson = await esRes.json()
      console.log('[POS] esquema calculo response:', esJson)

      if (esJson.data) {
        setPasosEsquema((esJson.data.pasos || []).sort((a: any, b: any) => a.secuencia_paso - b.secuencia_paso))
        setClasePedidoId(clasePedido.id)
        console.log('[POS] Esquema loaded. Pasos:', esJson.data.pasos?.length, 'clasePedidoId:', clasePedido.id)
      } else {
        console.log('[POS] No esquema found')
      }
    } catch (e) {
      console.error('[POS] Error fetching esquema cálculo:', e)
    }
  }, [])

  // Load esquema on mount - ejecutar directamente sin useEffect
  console.log('[POS] Before calling loadEsquemaCalculo')

  // Call loadEsquemaCalculo when sucursal is available
  useEffect(() => {
    console.log('[POS] useEffect for loadEsquemaCalculo, currentSucursal:', currentSucursal)
    if (currentSucursal) {
      loadEsquemaCalculo()
    }
  }, [currentSucursal, loadEsquemaCalculo])

  // Fetch categorias de materiales
  useEffect(() => {
    const fetchCategorias = async () => {
      const empresaId = getAuthStore().user?.empresaId
      if (!empresaId) return
      try {
        const res = await apiFetch(`/api/materiales/categorias?empresaId=${empresaId}&pageSize=50`)
        const json = await res.json()
        if (json.data) {
          setCategorias(json.data)
        }
      } catch (e) {
        console.error('[POS] Error fetching categorias:', e)
      }
    }
    fetchCategorias()
  }, [])

  // Fetch cupones activos
  useEffect(() => {
    const fetchCupones = async () => {
      const empresaId = getAuthStore().user?.empresaId
      if (!empresaId) return
      try {
        const res = await apiFetch(`/api/precios/cupones?empresaId=${empresaId}&pageSize=50`)
        const json = await res.json()
        if (json.data) {
          setCupones(json.data)
        }
        const tipoRes = await apiFetch('/api/tipos-condicion?search=DCTCUPON')
        const tipoJson = await tipoRes.json()
        if (tipoJson.data?.length > 0) {
          setCuponSimbolo(tipoJson.data[0].simbolo || '%')
        }
      } catch (e) {
        console.error('[POS] Error fetching cupones:', e)
      }
    }
    fetchCupones()
  }, [])

  // Load default almacen and moneda
  useEffect(() => {
    const loadDefaults = async () => {
      const user = getAuthStore().user
      if (user?.monedaId) {
        setDefaultMonedaId(user.monedaId)
      }
      if (currentSucursal?.id) {
        try {
          const res = await apiFetch(`/api/logistica/almacenes?sucursalId=${currentSucursal.id}&pageSize=1`)
          const json = await res.json()
          if (json.data?.length > 0) {
            setDefaultAlmacenId(json.data[0].id)
          }
        } catch (e) {
          console.error('[POS] Error loading default almacen:', e)
        }
      }
      // Load IGV from Condicion
      try {
        const tipoRes = await apiFetch('/api/tipos-condicion?search=IGV')
        const tipoJson = await tipoRes.json()
        const tipoIgv = tipoJson.data?.find((t: any) => t.codigo === 'IGV')
        if (tipoIgv?.id) {
          const condRes = await apiFetch(`/api/comercial/condiciones?tipo_condicion_id=${tipoIgv.id}&material_id=null`)
          const condJson = await condRes.json()
          const igvCondicion = condJson.data?.find((c: any) => c.activo && c.material_id === null)
          if (igvCondicion) {
            setIgvPorcentaje(Number(igvCondicion.valor))
            console.log('[POS] IGV loaded from Condicion:', igvCondicion.valor)
          }
        }
      } catch (e) {
        console.error('[POS] Error loading IGV:', e)
      }
    }
    loadDefaults()
  }, [currentSucursal])

  // Fetch condiciones for a specific material (used when adding to cart)
  const fetchCondicionesForMaterial = useCallback(async (materialId: number) => {
    try {
      const user = getAuthStore().user
      const monedaId = user?.monedaId
      const now = new Date()

      const [resSpecific, resGeneral] = await Promise.all([
        apiFetch(`/api/comercial/condiciones?material_id=${materialId}`),
        apiFetch(`/api/comercial/condiciones?material_id=null`)
      ])
      const jsonSpecific = await resSpecific.json()
      const jsonGeneral = await resGeneral.json()

      let allCondiciones = [...(jsonSpecific.data || []), ...(jsonGeneral.data || [])]

      // Filter by activo, moneda, and date
      if (monedaId) {
        allCondiciones = allCondiciones.filter((c: any) =>
          c.activo &&
          (!monedaId || c.moneda_id === monedaId || !c.moneda_id) &&
          new Date(c.fecha_desde) <= now &&
          (!c.fecha_hasta || new Date(c.fecha_hasta) >= now)
        )
      }

      console.log('[POS] condiciones response for material', materialId, ':', allCondiciones.length, 'filtered')
      console.log('[POS] condiciones details:', allCondiciones.map((c: any) => ({ id: c.id, tipo: c.tipo_condicion_id, mat: c.material_id, valor: c.valor, pct: c.porcentaje })))
      return allCondiciones
    } catch (e) {
      console.error('[POS] Error fetching condiciones:', e)
      return []
    }
  }, [])

  // Calculate single item using esquema de cálculo
  const calculateItemWithEsquema = useCallback(async (material: Material, cantidad: number, precioBase: number) => {
    console.log('[POS calculateItem] Starting calculation for material:', material.id, material.codigo)
    console.log('[POS calculateItem] pasosEsquema length:', pasosEsquema.length)

    let precioUnitBase = precioBase
    let descuentoItem = 0
    let impuestoItem = 0
    let subtotalBruto = cantidad * precioBase
    const pasosCalculados: CartItem['pasos_calculados'] = []

    if (pasosEsquema.length > 0) {
      // Get condiciones for this material
      const materialCondiciones = await fetchCondicionesForMaterial(material.id)
      console.log('[POS calculateItem] condiciones for material:', materialCondiciones.length)

      // Process each step
      for (const paso of pasosEsquema) {
        if (!paso.activo) continue

        let valorBase = 0
        let esPorcentaje = true

        // Find matching condition - try specific first, then general
        const condicionEspecifica = materialCondiciones.find((c: any) =>
          Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
          Number(c.material_id) === Number(material.id)
        )
        const condicionGeneral = materialCondiciones.find((c: any) =>
          Number(c.tipo_condicion_id) === Number(paso.condicion_id) &&
          (c.material_id === null || c.material_id === undefined)
        )
        const condicion = condicionEspecifica || condicionGeneral

        console.log('[POS calculateItem] Paso:', paso.descripcion_corta, 'tipo:', paso.tipo, 'paso.condicion_id:', paso.condicion_id, 'found:', condicion ? { valor: condicion.valor, pct: condicion.porcentaje, mat_id: condicion.material_id } : 'NOT FOUND')

        if (condicion) {
          const condValor = parseFloat(condicion.valor)
          if (condValor > 0) {
            valorBase = condValor
            esPorcentaje = condicion.porcentaje === true
          } else if (paso.tipo === 'Impuesto') {
            // Condition exists but has value 0, use default for IGV
            valorBase = 18
            esPorcentaje = true
          }
        } else if (paso.tipo === 'Impuesto') {
          // Default IGV 18%
          valorBase = 18
          esPorcentaje = true
        }

        let valorFinal = 0

        if (valorBase > 0) {
          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)
          console.log('[POS calculateItem] Computing value - paso:', paso.tipo, 'valorBase:', valorBase, 'baseCalculo:', baseCalculo, 'subtotalBruto:', subtotalBruto, 'precioUnitBase:', precioUnitBase, 'cantidad:', cantidad)

          if (esPorcentaje) {
            valorFinal = baseCalculo * (valorBase / 100)
          } else {
            valorFinal = valorBase
          }

          if (paso.tipo === 'Descuento') {
            descuentoItem = valorFinal
            subtotalBruto -= valorFinal
          } else if (paso.tipo === 'Impuesto') {
            impuestoItem = valorFinal
          } else if (paso.tipo === 'Precio') {
            const formulaStr = (paso.formula || '').toLowerCase()
            if (formulaStr.includes('cantidad') && cantidad > 0) {
              precioUnitBase = valorFinal / cantidad
              subtotalBruto = valorFinal
            } else {
              precioUnitBase = valorFinal
              subtotalBruto = cantidad * precioUnitBase
            }
          }
        }

        pasosCalculados.push({
          condicion_id: paso.condicion_id,
          esquema_id: paso.esquema_id,
          valor: valorFinal,
          codigo: paso.tipo,
          descripcion: paso.descripcion_corta,
          valor_original: valorBase,
          es_porcentaje: esPorcentaje
        })
      }

      const pasoIGV = pasosCalculados.find(p => p.codigo === 'Impuesto' && p.descripcion === 'IGV')
      console.log('[POS calculateItem] IGV fix - pasoIGV:', pasoIGV, 'valor:', pasoIGV?.valor, 'subtotalBruto:', subtotalBruto, 'igvPorcentaje:', igvPorcentaje)
      if (pasoIGV && pasoIGV.valor === 0 && subtotalBruto > 0) {
        const igvPct = igvPorcentaje / 100
        pasoIGV.valor = subtotalBruto * igvPct
        pasoIGV.valor_original = igvPorcentaje
        impuestoItem = pasoIGV.valor
        console.log('[POS calculateItem] IGV fixed - nuevo valor:', pasoIGV.valor)
      }
    } else {
      // Default: IGV from Condicion table
      const igvPct = igvPorcentaje / 100
      impuestoItem = subtotalBruto * igvPct
      pasosCalculados.push({
        condicion_id: null,
        esquema_id: null,
        valor: impuestoItem,
        codigo: 'Impuesto',
        descripcion: 'IGV',
        valor_original: igvPorcentaje,
        es_porcentaje: true
      })
    }

    const subtotal = subtotalBruto + impuestoItem

    console.log('[POS calculateItem] Result - precio:', precioUnitBase, 'desc:', descuentoItem, 'imp:', impuestoItem, 'sub:', subtotal)

    return {
      precio_unit: precioUnitBase,
      descuento: descuentoItem,
      impuesto: impuestoItem,
      subtotal: subtotal,
      pasos_calculados: pasosCalculados
    }
  }, [pasosEsquema, fetchCondicionesForMaterial, igvPorcentaje])

  // Load condiciones when esquema is loaded (always fetch, not just when cart has items)
  useEffect(() => {
    console.log('[POS] condiciones effect - pasosEsquema:', pasosEsquema.length)
    // Conditions are now fetched per-material when adding to cart
  }, [pasosEsquema])

  // Sync promocionTotal from cart items ( более надёжный способ)
  useEffect(() => {
    console.log('[POS] syncPromocionTotal - cart.length:', cart.length, 'promociones.length:', promociones.length)
    if (cart.length === 0 || promociones.length === 0) {
      if (promocionTotal) {
        console.log('[POS] syncPromocionTotal - clearing (empty cart or no promos)')
        setPromocionTotal(null)
      }
      return
    }

    // Find items with active promo
    const itemsWithPromo = cart.filter(item => item.pasos_calculados?.some(p => p.descripcion === 'Promocion' && p.valor > 0))
    console.log('[POS] syncPromocionTotal - itemsWithPromo.length:', itemsWithPromo.length)

    if (itemsWithPromo.length > 0) {
      // Sum up promo values and cantidad_gratis from all items
      let totalPromoDescuento = 0
      let totalCantidadGratis = 0
      let promoNombre = ''
      let promoId = 0

      itemsWithPromo.forEach(item => {
        const pasosPromo = item.pasos_calculados?.filter(p => p.descripcion === 'Promocion') || []
        const promoPaso = pasosPromo[0]
        if (promoPaso) {
          totalPromoDescuento += promoPaso.valor
          totalCantidadGratis += item.promocion_aplicada?.cantidad_regalo || 0
          promoNombre = item.promocion_aplicada?.nombre || 'Promocion'
          promoId = item.promocion_aplicada?.promoId || 0
        }
      })

      const activePromo = {
        nombre: promoNombre,
        valor: totalPromoDescuento,
        promoId: promoId,
        cantidad_regalo: totalCantidadGratis
      }
      console.log('[POS] syncPromocionTotal - setting:', activePromo)
      setPromocionTotal(activePromo)
    } else if (promocionTotal) {
      console.log('[POS] syncPromocionTotal - clearing (no items with promo)')
      setPromocionTotal(null)
    }
  }, [cart, promociones])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (nif.trim().length >= 3) {
        try {
          const res = await apiFetch(`/api/clientes?search=${nif.trim()}`)
          const json = await res.json()
          const found = (json.data ?? []).find((c: any) => c.nif === nif.trim() || c.codigo === nif.trim())
          if (found) {
            setClienteNombre(found.nombre)
            setClienteId(found.id)
          } else {
            setClienteNombre('')
            setClienteId(null)
          }
        } catch { }
      } else {
        setClienteNombre('')
        setClienteId(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [nif])

  const handleBuscarCliente = async () => {
    if (!numeroIdentificacion) return
    try {
      const res = await apiFetch(`/api/clientes?search=${numeroIdentificacion}&pageSize=50`)
      if (res.ok) {
        const body = await res.json()
        const match = body.data?.find((c: any) => c.nif?.toString()?.toLowerCase() === numeroIdentificacion.toLowerCase())
        if (match) {
          setClienteId(match.id)
          setClienteNombreFull(match.nombre || '')
          setNombresCompletos(match.nombres_completos || '')
          setApellidosCompletos(match.apellidos_completos || '')
          setDireccion(match.direccion || '')
          setDepartamento(match.departamento || '')
          setProvincia(match.provincia || '')
          setDistrito(match.distrito || '')
          setUbigeo(match.ubigeo || '')
          toast.success('Cliente encontrado')
        } else {
          setClienteId(null)
        }
      }
    } catch (error) {
      console.error('Error buscando cliente:', error)
    }
  }

  async function addToCart(material: Material) {
    const precioBase = preciosDinamicos.get(material.id) ?? 0
    console.log('[POS addToCart] material:', material.codigo, 'precioBase:', precioBase, 'pasosEsquema length:', pasosEsquema.length)
    if (!precioBase || precioBase <= 0) {
      toast.error('El material no tiene precio definido.')
      return
    }

    // Calculate item using esquema de cálculo if available
    let calculated: {
      precio_unit: number
      descuento: number
      impuesto: number
      subtotal: number
      pasos_calculados?: CartItem['pasos_calculados']
    } = {
      precio_unit: precioBase,
      descuento: 0,
      impuesto: 0,
      subtotal: precioBase,
      pasos_calculados: []
    }

    console.log('[POS addToCart] Using esquema:', pasosEsquema.length > 0)
    if (pasosEsquema.length > 0) {
      calculated = await calculateItemWithEsquema(material, 1, precioBase)
      console.log('[POS addToCart] Calculated result:', calculated, 'pasos:', JSON.stringify(calculated.pasos_calculados))
    } else {
      const impPct = Number(material.impuesto?.porcentaje ?? igvPorcentaje) / 100
      const descuentoComercial = descuentos.get(material.id)
      console.log('[POS addToCart] material:', material.codigo, 'descuentoComercial:', descuentoComercial, 'descuentos map size:', descuentos.size)
      let pasosDefault: CartItem['pasos_calculados'] = [{
        condicion_id: null,
        esquema_id: null,
        valor: precioBase * impPct,
        codigo: 'Impuesto',
        descripcion: 'IGV',
        valor_original: material.impuesto?.porcentaje ?? igvPorcentaje,
        es_porcentaje: true
      }]
      let descuentoItem = 0
      if (descuentoComercial) {
        if (descuentoComercial.porcentaje) {
          descuentoItem = precioBase * (descuentoComercial.valor / 100)
        } else {
          descuentoItem = descuentoComercial.valor
        }
        pasosDefault.push({
          condicion_id: null,
          esquema_id: null,
          valor: descuentoItem,
          codigo: 'Descuento',
          descripcion: 'DCTVTA',
          valor_original: descuentoComercial.valor,
          es_porcentaje: descuentoComercial.porcentaje
        })
      }
      calculated = {
        precio_unit: precioBase,
        descuento: descuentoItem,
        impuesto: precioBase * impPct,
        subtotal: precioBase + (precioBase * impPct) - descuentoItem,
        pasos_calculados: pasosDefault
      }
    }

    if (cuponAplicado) {
      const tieneRestriccion = materialesValidos.length > 0
      const materialCalifica = !tieneRestriccion || materialesValidos.includes(material.id)
      const itemSubtotal = calculated.precio_unit
      console.log('[POS addToCart] Checking if new material qualifies, materialCalifica:', materialCalifica, 'material.id:', material.id, 'materialesValidos:', materialesValidos, 'tieneRestriccion:', tieneRestriccion)

      if (materialCalifica) {
        let cuponItemValor = 0

        const pasoCuponEsquema = pasosEsquema.find(p => p.descripcion_corta === 'Cupon')
        const pasoPromoEsquema = pasosEsquema.find(p => p.descripcion_corta === 'Promocion')

        if (cuponAplicado.tipo === 'PORCENTAJE') {
          cuponItemValor = calculated.precio_unit * (cuponAplicado.valor / 100)
        } else {
          cuponItemValor = (descuentoCupon / materialesValidos.length)
        }

        console.log('[POS addToCart] Applying cupon to new material, cuponItemValor:', cuponItemValor, 'pasoCuponEsquema:', pasoCuponEsquema)

        if (!cuponAplicado.acumulable && cuponItemValor > 0) {
          if (calculated.descuento > cuponItemValor) {
            calculated.pasos_calculados = calculated.pasos_calculados?.map(p => {
              if (p.codigo === 'Descuento' && p.descripcion === 'Cupon') {
                return { ...p, valor: 0 }
              }
              return p
            }) || []
            calculated.pasos_calculados.push({
              condicion_id: pasoCuponEsquema?.condicion_id || null,
              esquema_id: null,
              valor: 0,
              codigo: 'Descuento',
              descripcion: 'Cupon',
              valor_original: cuponAplicado.tipo === 'PORCENTAJE' ? cuponAplicado.valor : cuponItemValor,
              es_porcentaje: cuponAplicado.tipo === 'PORCENTAJE'
            })
          } else {
            calculated.pasos_calculados = calculated.pasos_calculados?.map(p => {
              if (p.codigo === 'Descuento' && p.valor > 0 && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion') {
                return { ...p, valor: 0 }
              }
              return p
            }) || []
            calculated.pasos_calculados.push({
              condicion_id: pasoCuponEsquema?.condicion_id || null,
              esquema_id: null,
              valor: cuponItemValor,
              codigo: 'Descuento',
              descripcion: 'Cupon',
              valor_original: cuponAplicado.tipo === 'PORCENTAJE' ? cuponAplicado.valor : cuponItemValor,
              es_porcentaje: cuponAplicado.tipo === 'PORCENTAJE'
            })
          }
        } else if (cuponAplicado.acumulable && cuponItemValor > 0) {
          calculated.pasos_calculados = calculated.pasos_calculados || []
          calculated.pasos_calculados.push({
            condicion_id: pasoCuponEsquema?.condicion_id || null,
            esquema_id: null,
            valor: cuponItemValor,
            codigo: 'Descuento',
            descripcion: 'Cupon',
            valor_original: cuponAplicado.tipo === 'PORCENTAJE' ? cuponAplicado.valor : cuponItemValor,
            es_porcentaje: cuponAplicado.tipo === 'PORCENTAJE'
          })
        }

        const descuentoTotal = calculated.pasos_calculados?.filter(p => p.codigo === 'Descuento').reduce((sum, p) => sum + p.valor, 0) || 0
        const pasosImpuesto = calculated.pasos_calculados?.filter(p => p.codigo === 'Impuesto') || []
        let nuevoImpuesto = pasosImpuesto.reduce((sum, p) => sum + p.valor, 0)

        if (descuentoTotal > calculated.descuento && pasosImpuesto.length > 0) {
          nuevoImpuesto = 0
          pasosImpuesto.forEach((p: any) => {
            const pctImpuesto = (p.valor_original || 18) / 100
            const base = itemSubtotal - descuentoTotal
            nuevoImpuesto += base * pctImpuesto
            p.valor = base * pctImpuesto
          })
        }

        calculated.descuento = descuentoTotal
        calculated.impuesto = nuevoImpuesto
        calculated.subtotal = itemSubtotal - descuentoTotal + nuevoImpuesto
        console.log('[POS addToCart] Applied cupon - descuento:', descuentoTotal, 'impuesto:', nuevoImpuesto, 'subtotal:', calculated.subtotal)
      } else {
        console.log('[POS addToCart] Material does NOT qualify for cupon, no discount applied')
      }
    }

    // Apply promotion logic (2x1)
    const applyPromotionLogic = (currentCart: CartItem[], newMaterial: Material, newCantidad: number): {
      updatedCart: CartItem[],
      promoTotal: { promoId: number; nombre: string; cantidad_regalo: number; valor: number } | null,
      descuentoPromo: number,
      nuevosPasos: CartItem['pasos_calculados']
    } => {
      if (promociones.length === 0) {
        return { updatedCart: currentCart, promoTotal: null, descuentoPromo: 0, nuevosPasos: calculated.pasos_calculados || [] }
      }

      const applicablePromos = promociones.filter(promo => {
        const materialMatch = promo.material_ids.includes(newMaterial.id)
        const categoriaMatch = newMaterial.categoria_id && promo.categoria_ids.includes(newMaterial.categoria_id)
        return materialMatch || categoriaMatch
      })

      if (applicablePromos.length === 0) {
        return { updatedCart: currentCart, promoTotal: null, descuentoPromo: 0, nuevosPasos: calculated.pasos_calculados || [] }
      }

      const promo = applicablePromos[0]
      const { cantidad_compra, cantidad_regalo } = promo

      console.log('[POS applyPromotionLogic] promo:', promo.nombre, 'materiales afectos:', promo.material_ids, 'categorias afectos:', promo.categoria_ids, 'newMaterial:', newMaterial.id, newMaterial.codigo, 'categoria:', newMaterial.categoria_id)

      const allCartItems = [...currentCart, { material: newMaterial, cantidad: newCantidad, precio_unit: calculated.precio_unit, descuento: calculated.descuento, subtotal: calculated.subtotal, impuesto: calculated.impuesto, almacen_id: defaultAlmacenId, unidad_medida_id: newMaterial.unidad_medida_id || 1, pasos_calculados: calculated.pasos_calculados }]

      const itemsWithPromoMaterial = allCartItems.filter(item =>
        promo.material_ids.includes(item.material.id) ||
        (item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id))
      )

      console.log('[POS applyPromotionLogic] itemsWithPromoMaterial:', itemsWithPromoMaterial.map(i => ({ id: i.material.id, codigo: i.material.codigo, cantidad: i.cantidad })))

      if (itemsWithPromoMaterial.length === 0) {
        return { updatedCart: currentCart, promoTotal: null, descuentoPromo: 0, nuevosPasos: calculated.pasos_calculados || [] }
      }

      // Calculate combined quantity for all promo items
      const totalCantidad = itemsWithPromoMaterial.reduce((sum, item) => sum + item.cantidad, 0)
      const divisionEnteraTotal = Math.floor(totalCantidad / cantidad_compra)

      let totalPromoDescuento = 0

      if (divisionEnteraTotal > 0) {
        // Combined quantity meets the requirement - only apply to ONE item (the cheapest by precio_unit)
        const sortedByPrice = [...itemsWithPromoMaterial].sort((a, b) => {
          const precioA = a.precio_unit
          const precioB = b.precio_unit
          return precioA - precioB
        })

        // Get the cheapest item (by unit price after discounts)
        const cheapestItem = sortedByPrice[0]

        // Get commercial discount and coupon from pasos_calculados
        const pasosActuales = cheapestItem.pasos_calculados || []
        const descuentoComercialPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
        const descuentoCuponPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
        const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
        const descuentoCuponUnitario = descuentoCuponPaso?.valor || 0

        // Calculate effective unit price WITHOUT commercial discount (promo applies to base price only)
        const cantidadGratis = divisionEnteraTotal
        const valorDescuento = cantidadGratis * cheapestItem.precio_unit
        totalPromoDescuento = valorDescuento

        const newCartWithPromo = allCartItems.map(item => {
          if (item.material.id !== cheapestItem.material.id) return item

          // Get commercial discount and coupon for this item
          const itemPasosActuales = item.pasos_calculados || []
          const itemDescuentoComercialPaso = itemPasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
          const itemDescuentoCuponPaso = itemPasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
          const itemDescuentoComercialUnitario = itemDescuentoComercialPaso?.valor || 0
          const itemDescuentoCuponUnitario = itemDescuentoCuponPaso?.valor || 0

          // Total discount = commercial (unit) * quantity + coupon (unit) * quantity
          const descuentoComercialTotal = itemDescuentoComercialUnitario * item.cantidad
          const descuentoCuponTotal = itemDescuentoCuponUnitario * item.cantidad

          const pasosConPromo = [
            ...itemPasosActuales,
            {
              condicion_id: null,
              esquema_id: null,
              valor: valorDescuento,
              codigo: 'Descuento',
              descripcion: 'Promocion',
              valor_original: cantidadGratis,
              es_porcentaje: false
            }
          ]

          return {
            ...item,
            pasos_calculados: pasosConPromo,
            descuento: descuentoComercialTotal + descuentoCuponTotal,
            descuento_promocion: (item.descuento_promocion || 0) + valorDescuento,
            subtotal: item.subtotal - valorDescuento,
            promocion_aplicada: {
              promoId: promo.id,
              nombre: promo.nombre,
              cantidad_regalo: cantidadGratis,
              valor_descuento: valorDescuento
            }
          }
        })

        const promoInfo = totalPromoDescuento > 0
          ? { promoId: promo.id, nombre: promo.nombre, cantidad_regalo: cantidadGratis, valor: totalPromoDescuento }
          : null

        return {
          updatedCart: newCartWithPromo,
          promoTotal: promoInfo,
          descuentoPromo: totalPromoDescuento,
          nuevosPasos: newCartWithPromo.find(i => i.material.id === newMaterial.id)?.pasos_calculados || calculated.pasos_calculados || []
        }
      }

      // No promo applied - return original
      return { updatedCart: currentCart, promoTotal: null, descuentoPromo: 0, nuevosPasos: calculated.pasos_calculados || [] }
    }

    const promoResult = applyPromotionLogic(cart, material, 1)
    const newItemFromPromo = promoResult.updatedCart.find(i => i.material.id === material.id)
    const promoTotalInfo = promoResult.promoTotal
    const descuentoPromo = promoResult.descuentoPromo
    const pasosConPromo = promoResult.nuevosPasos

    console.log('[POS addToCart] applyPromotionLogic result - material:', material.codigo, 'promoTotalInfo:', promoTotalInfo, 'promoResult.updatedCart length:', promoResult.updatedCart.length)

    if (promoTotalInfo) {
      console.log('[POS] addToCart - setPromocionTotal (new item):', promoTotalInfo)
      setPromocionTotal(promoTotalInfo)
    } else {
      console.log('[POS] addToCart - promoTotalInfo is null, NOT setting promocionTotal')
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.material.id === material.id)
      if (existing) {
        const newQty = existing.cantidad + 1
        if (newQty > Number(material.stock_actual)) { toast.error('Stock insuficiente'); return prev }

        const itemImpuestoPorUnidad = existing.impuesto / existing.cantidad
        const nuevoImpuesto = itemImpuestoPorUnidad * newQty
        const nuevoSubtotal = precioBase * newQty

        const newItem: CartItem = {
          ...existing,
          cantidad: newQty,
          precio_unit: precioBase,
          descuento: existing.descuento * newQty / existing.cantidad,
          descuento_cupon: (existing.descuento_cupon || 0) * newQty / existing.cantidad,
          descuento_promocion: existing.descuento_promocion,
          subtotal: nuevoSubtotal - (existing.descuento * newQty / existing.cantidad) - ((existing.descuento_cupon || 0) * newQty / existing.cantidad) - (existing.descuento_promocion || 0) + nuevoImpuesto,
          impuesto: nuevoImpuesto
        }

        const cartWithUpdatedItem = prev.map((i) =>
          i.material.id === material.id ? newItem : i
        )

        // Recalculate promotions after updating quantity (combined quantity logic)
        if (promociones.length > 0) {
          let totalPromoDescuento = 0
          let activePromo: { nombre: string; valor: number; promoId: number; cantidad_regalo: number } | null = null

          // Group by promotion and calculate combined quantities
          const promoGroups = new Map<number, { promo: any; items: CartItem[] }>()

          cartWithUpdatedItem.forEach(item => {
            const applicablePromos = promociones.filter(promo => {
              const materialMatch = promo.material_ids.includes(item.material.id)
              const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
              return materialMatch || categoriaMatch
            })

            if (applicablePromos.length > 0) {
              const promoId = applicablePromos[0].id
              if (!promoGroups.has(promoId)) {
                promoGroups.set(promoId, { promo: applicablePromos[0], items: [] })
              }
              promoGroups.get(promoId)!.items.push(item)
            }
          })

          let newCartWithPromo = cartWithUpdatedItem.map(item => {
            const applicablePromos = promociones.filter(promo => {
              const materialMatch = promo.material_ids.includes(item.material.id)
              const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
              return materialMatch || categoriaMatch
            })

            if (applicablePromos.length === 0) return item

            const promo = applicablePromos[0]
            const promoGroup = promoGroups.get(promo.id)
            if (!promoGroup) return item

            const { cantidad_compra, cantidad_regalo } = promo
            const totalCantidad = promoGroup.items.reduce((sum, i) => sum + i.cantidad, 0)
            const divisionEnteraTotal = Math.floor(totalCantidad / cantidad_compra)

            if (divisionEnteraTotal > 0) {
              // Sort by effective price (cheapest first)
              const sortedItems = [...promoGroup.items].sort((a, b) => {
                const precioA = a.precio_unit
                const precioB = b.precio_unit
                return precioA - precioB
              })

              // Only apply to ONE item (cheapest)
              const cheapestItem = sortedItems[0]

              if (item.material.id === cheapestItem.material.id) {
                // Get commercial discount and coupon from pasos_calculados (excluding promo)
                const pasosActuales = item.pasos_calculados || []
                const descuentoComercialPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
                const descuentoCuponBusqueda = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
                const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
                const descuentoCuponUnitario = descuentoCuponBusqueda?.valor || 0
                // Promo applies to base price only, not after commercial discount
                const cantidadGratis = divisionEnteraTotal
                const valorDescuento = cantidadGratis * item.precio_unit
                totalPromoDescuento += valorDescuento
                activePromo = { nombre: promo.nombre, valor: totalPromoDescuento, promoId: promo.id, cantidad_regalo: cantidadGratis }

                const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
                const pasosConPromo = [
                  ...pasosSinPromo,
                  {
                    condicion_id: null,
                    esquema_id: null,
                    valor: valorDescuento,
                    codigo: 'Descuento',
                    descripcion: 'Promocion',
                    valor_original: cantidadGratis,
                    es_porcentaje: false
                  }
                ]

                return {
                  ...item,
                  pasos_calculados: pasosConPromo,
                  descuento: descuentoComercialUnitario * item.cantidad,
                  descuento_cupon: descuentoCuponUnitario * item.cantidad,
                  subtotal: item.precio_unit * item.cantidad,
                  descuento_promocion: (item.descuento_promocion || 0) + valorDescuento,
                  promocion_aplicada: {
                    promoId: promo.id,
                    nombre: promo.nombre,
                    cantidad_regalo: cantidadGratis,
                    valor_descuento: valorDescuento
                  }
                }
              }
            }

            // Remove existing promo if no longer applies
            const pasosActuales = item.pasos_calculados || []
            const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
            const promoSteps = pasosActuales.filter(p => p.descripcion === 'Promocion')
            const descuentoPromo = promoSteps.reduce((sum, p) => sum + p.valor, 0)

            return {
              ...item,
              pasos_calculados: pasosSinPromo,
              descuento: item.descuento,
              descuento_promocion: Math.max(0, (item.descuento_promocion || 0) - descuentoPromo),
              subtotal: item.subtotal + descuentoPromo,
              promocion_aplicada: undefined
            }
          })

          if (activePromo) {
            console.log('[POS] addToCart (existing item) - setPromocionTotal:', activePromo)
            setPromocionTotal(activePromo)
          } else {
            console.log('[POS] addToCart (existing item) - activePromo is null, clearing promocionTotal')
            setPromocionTotal(null)
          }
          return newCartWithPromo
        }

        return cartWithUpdatedItem
      }

      const newCart = [...prev, {
        material,
        cantidad: 1,
        precio_unit: calculated.precio_unit,
        descuento: newItemFromPromo?.descuento ?? calculated.descuento,
        descuento_cupon: newItemFromPromo?.descuento_cupon ?? 0,
        descuento_promocion: newItemFromPromo?.descuento_promocion ?? 0,
        subtotal: newItemFromPromo?.subtotal ?? calculated.subtotal,
        impuesto: calculated.impuesto,
        almacen_id: defaultAlmacenId,
        unidad_medida_id: material.unidad_medida_id || 1,
        pasos_calculados: newItemFromPromo?.pasos_calculados ?? calculated.pasos_calculados,
        promocion_aplicada: newItemFromPromo?.promocion_aplicada ?? (promoTotalInfo ? {
          promoId: promoTotalInfo.promoId || promociones[0]?.id || 0,
          nombre: promoTotalInfo.nombre || '',
          cantidad_regalo: promoTotalInfo.cantidad_regalo || 0,
          valor_descuento: descuentoPromo
        } : undefined)
      }]

      // Recalculate promotions for new cart
      if (promociones.length > 0) {
        let totalPromoDescuento = 0
        let activePromo: { nombre: string; valor: number; promoId: number; cantidad_regalo: number } | null = null

        // Group by promotion
        const promoGroups = new Map<number, { promo: any; items: CartItem[] }>()

        newCart.forEach(item => {
          const applicablePromos = promociones.filter(promo => {
            const materialMatch = promo.material_ids.includes(item.material.id)
            const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
            return materialMatch || categoriaMatch
          })

          if (applicablePromos.length > 0) {
            const promoId = applicablePromos[0].id
            if (!promoGroups.has(promoId)) {
              promoGroups.set(promoId, { promo: applicablePromos[0], items: [] })
            }
            promoGroups.get(promoId)!.items.push(item)
          }
        })

        const newCartWithPromo = newCart.map(item => {
          const applicablePromos = promociones.filter(promo => {
            const materialMatch = promo.material_ids.includes(item.material.id)
            const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
            return materialMatch || categoriaMatch
          })

          if (applicablePromos.length === 0) return item

          const promo = applicablePromos[0]
          const promoGroup = promoGroups.get(promo.id)
          if (!promoGroup) return item

          const { cantidad_compra, cantidad_regalo } = promo
          const totalCantidad = promoGroup.items.reduce((sum, i) => sum + i.cantidad, 0)
          const divisionEnteraTotal = Math.floor(totalCantidad / cantidad_compra)

          if (divisionEnteraTotal > 0) {
            const sortedItems = [...promoGroup.items].sort((a, b) => {
              const precioA = a.precio_unit
              const precioB = b.precio_unit
              return precioA - precioB
            })

            // Only apply to ONE item (cheapest)
            const cheapestItem = sortedItems[0]

            if (item.material.id === cheapestItem.material.id) {
              const pasosActuales = item.pasos_calculados || []
              const descuentoComercialPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
              const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
              const descuentoCuponPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
              const descuentoCuponUnitario = descuentoCuponPaso?.valor || 0
              const cantidadGratis = divisionEnteraTotal
              const valorDescuento = cantidadGratis * item.precio_unit
              totalPromoDescuento += valorDescuento
              activePromo = { nombre: promo.nombre, valor: totalPromoDescuento, promoId: promo.id, cantidad_regalo: cantidadGratis }

              const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
              const pasosConPromo = [
                ...pasosSinPromo,
                {
                  condicion_id: null,
                  esquema_id: null,
                  valor: valorDescuento,
                  codigo: 'Descuento',
                  descripcion: 'Promocion',
                  valor_original: cantidadGratis,
                  es_porcentaje: false
                }
              ]

              return {
                ...item,
                pasos_calculados: pasosConPromo,
                descuento: item.descuento,
                subtotal: item.subtotal - valorDescuento,
                promocion_aplicada: {
                  promoId: promo.id,
                  nombre: promo.nombre,
                  cantidad_regalo: cantidadGratis,
                  valor_descuento: valorDescuento
                }
              }
            }
          }

          // Remove existing promo
          const pasosActuales = item.pasos_calculados || []
          const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
          const promoSteps = pasosActuales.filter(p => p.descripcion === 'Promocion')
          const descuentoPromo = promoSteps.reduce((sum, p) => sum + p.valor, 0)

          return {
            ...item,
            pasos_calculados: pasosSinPromo,
            descuento: item.descuento,
            descuento_promocion: Math.max(0, (item.descuento_promocion || 0) - descuentoPromo),
            subtotal: item.subtotal + descuentoPromo,
            promocion_aplicada: undefined
          }
        })

        if (activePromo) {
          console.log('[POS] addToCart (new cart) - setPromocionTotal:', activePromo)
          setPromocionTotal(activePromo)
        } else {
          console.log('[POS] addToCart (new cart) - activePromo is null, clearing promocionTotal')
          setPromocionTotal(null)
        }
        return newCartWithPromo
      }

      return newCart
    })
  }

  async function updateQty(materialId: number, qty: number) {
    if (qty <= 0) { removeFromCart(materialId); return }
    const mat = materiales.find((m) => m.id === materialId)
    if (!mat) { toast.error('Material no encontrado'); return }
    if (qty > Number(mat.stock_actual)) { toast.error('Stock insuficiente'); return }

    const item = cart.find((i) => i.material.id === materialId)
    if (!item) return

    // NO scale descuentos proporcionalmente - la función recalculatePromotions maneja el cálculo correcto
    // Las promociones tienen lógica especial (ej: 3x2) que no puede escalar proporcionalmente

    // Recalculate promotion when quantity changes (combined quantity logic)
    const recalculatePromotions = (currentCart: CartItem[], cantidadesAnteriores?: Map<number, number>): { updatedCart: CartItem[], promoTotal: { nombre: string; valor: number } | null } => {
      if (promociones.length === 0 || currentCart.length === 0) {
        return { updatedCart: currentCart, promoTotal: null }
      }

      let totalPromoDescuento = 0
      let activePromo: { nombre: string; valor: number; promoId: number; cantidad_regalo: number } | null = null

      // Group by promotion
      const promoGroups = new Map<number, { promo: any; items: CartItem[] }>()

      currentCart.forEach(item => {
        const applicablePromos = promociones.filter(promo => {
          const materialMatch = promo.material_ids.includes(item.material.id)
          const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
          return materialMatch || categoriaMatch
        })

        console.log('[POS recalculatePromotions] item:', item.material.codigo, 'applicablePromos:', applicablePromos.length > 0 ? 'YES' : 'NO')

        if (applicablePromos.length > 0) {
          const promoId = applicablePromos[0].id
          if (!promoGroups.has(promoId)) {
            promoGroups.set(promoId, { promo: applicablePromos[0], items: [] })
          }
          promoGroups.get(promoId)!.items.push(item)
        }
      })

      let newCartWithPromo = currentCart.map(item => {
        const applicablePromos = promociones.filter(promo => {
          const materialMatch = promo.material_ids.includes(item.material.id)
          const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
          return materialMatch || categoriaMatch
        })

        console.log('[POS recalculatePromotions map] item:', item.material.codigo, 'applicablePromos length:', applicablePromos.length)

        if (applicablePromos.length === 0) return item

        const promo = applicablePromos[0]
        const promoGroup = promoGroups.get(promo.id)
        if (!promoGroup) return item

        const { cantidad_compra, cantidad_regalo } = promo
        const totalCantidad = promoGroup.items.reduce((sum, i) => sum + i.cantidad, 0)
        const divisionEnteraTotal = Math.floor(totalCantidad / cantidad_compra)

        if (divisionEnteraTotal > 0) {
          const sortedItems = [...promoGroup.items].sort((a, b) => {
            const precioA = a.precio_unit
            const precioB = b.precio_unit
            return precioA - precioB
          })

          // Only apply to ONE item (cheapest)
          const cheapestItem = sortedItems[0]

          console.log('[POS recalculatePromotions] Applying promo - divisionEnteraTotal:', divisionEnteraTotal, 'cheapestItem:', cheapestItem?.material.codigo, 'currentItem:', item.material.codigo)

          if (item.material.id === cheapestItem.material.id) {
            // Validar primero si cumple la condición de promoción
            if (divisionEnteraTotal <= 0) {
              // No cumple la condición - eliminar paso de promo si existe
              const pasosActuales = item.pasos_calculados || []
              const pasoPromoExistente = pasosActuales.find(p => p.descripcion === 'Promocion')
              if (pasoPromoExistente) {
                const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
                return {
                  ...item,
                  pasos_calculados: pasosSinPromo,
                  descuento_promocion: 0,
                  subtotal: item.precio_unit * item.cantidad,
                  promocion_aplicada: undefined
                }
              }
              return item
            }

            const pasosActuales = item.pasos_calculados || []
            const descuentoComercialPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
            const cantidadAnteriorItem = cantidadesAnteriores?.get(item.material.id) || cheapestItem.cantidad
            const descuentoComercialUnitario = descuentoComercialPaso?.valor ? descuentoComercialPaso.valor / cantidadAnteriorItem : 0
            const descuentoCuponPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
            const descuentoCuponUnitario = descuentoCuponPaso?.valor ? descuentoCuponPaso.valor / cantidadAnteriorItem : 0
            const cantidadGratis = divisionEnteraTotal
            const valorDescuento = cantidadGratis * item.precio_unit

            totalPromoDescuento += valorDescuento
            activePromo = { nombre: promo.nombre, valor: totalPromoDescuento, promoId: promo.id, cantidad_regalo: cantidadGratis }

            const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
            // Update cupon and commercial discount steps with recalculated values based on new quantity
            const pasosConCupónActualizado = pasosSinPromo.map(p => {
              if (p.descripcion === 'Cupon') {
                return {
                  ...p,
                  valor: descuentoCuponUnitario * item.cantidad
                }
              }
              if (p.descripcion !== 'Promocion') {
                return {
                  ...p,
                  valor: descuentoComercialUnitario * item.cantidad
                }
              }
              return p
            })
            const pasosConPromo = [
              ...pasosConCupónActualizado,
              {
                condicion_id: null,
                esquema_id: null,
                valor: valorDescuento,
                codigo: 'Descuento',
                descripcion: 'Promocion',
                valor_original: cantidadGratis,
                es_porcentaje: false
              }
            ]

            const nuevoSubtotalNeto = (item.precio_unit * item.cantidad) - (descuentoComercialUnitario * item.cantidad) - (descuentoCuponUnitario * item.cantidad) - valorDescuento
            const nuevoImpuesto = nuevoSubtotalNeto * (igvPorcentaje / 100)
            return {
              ...item,
              pasos_calculados: pasosConPromo,
              descuento: descuentoComercialUnitario * item.cantidad,
              descuento_cupon: descuentoCuponUnitario * item.cantidad,
              descuento_promocion: valorDescuento,
              subtotal: nuevoSubtotalNeto + nuevoImpuesto,
              impuesto: nuevoImpuesto,
              promocion_aplicada: {
                promoId: promo.id,
                nombre: promo.nombre,
                cantidad_regalo: cantidadGratis,
                valor_descuento: valorDescuento
              }
            }
          }
        }

        // Remove promo if no longer applies
        const pasosActuales = item.pasos_calculados || []
        const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
        const promoSteps = pasosActuales.filter(p => p.descripcion === 'Promocion')
        const descuentoPromo = promoSteps.reduce((sum, p) => sum + p.valor, 0)

        return {
          ...item,
          pasos_calculados: pasosSinPromo,
          descuento: item.descuento,
          descuento_promocion: 0,
          subtotal: item.precio_unit * item.cantidad,
          promocion_aplicada: undefined
        }
      })

      newCartWithPromo = newCartWithPromo.map(item => {
        const totalDiscount = item.descuento + (item.descuento_cupon || 0) + (item.descuento_promocion || 0)
        return {
          ...item,
          subtotal: item.precio_unit * item.cantidad - totalDiscount + item.impuesto
        }
      })

      return { updatedCart: newCartWithPromo, promoTotal: activePromo }
    }

    // First update quantity only, then recalculate promotions which handles all discounts correctly
    let updatedCart = cart
    let promoInfo: { nombre: string; valor: number } | null = null

    setCart((prev) => {
      // Get original quantity BEFORE updating
      const itemOriginal = prev.find(i => i.material.id === materialId)
      const cantidadAnterior = itemOriginal?.cantidad || 1

      // Build map of previous quantities for all items
      const cantidadesAnterioresMap = new Map<number, number>()
      prev.forEach(i => cantidadesAnterioresMap.set(i.material.id, i.cantidad))

      // Update only quantity first
      const newCart = prev.map((i) => {
        if (i.material.id !== materialId) return i
        return { ...i, cantidad: qty }
      })

      // recalculatePromotions will compute the correct descuento, impuesto and subtotal
      const promoResult = recalculatePromotions(newCart, cantidadesAnterioresMap)
      updatedCart = promoResult.updatedCart
      promoInfo = promoResult.promoTotal

      // Check if the updated item still has promocion applied
      const itemActualizado = updatedCart.find(i => i.material.id === materialId)
      if (!itemActualizado) {
        return prev
      }
      const pasoPromo = itemActualizado.pasos_calculados?.find(p => p.descripcion === 'Promocion' && p.valor > 0)

      // If no promocion applied, recalculate impuesto using the original values from the item
      if (!pasoPromo) {
        // Get cupon discount value and convert to unitario (divide by PREVIOUS quantity)
        const pasoCupon = itemOriginal?.pasos_calculados?.find(p => p.descripcion === 'Cupon')
        const cuponTotal = pasoCupon?.valor || 0
        const cuponUnitario = cantidadAnterior > 0 ? cuponTotal / cantidadAnterior : 0

        // Get other descuentos (commercial discount) and convert to unitario (divide by PREVIOUS quantity)
        const pasosDesc = itemOriginal?.pasos_calculados?.filter(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon') || []
        const descuentoComercialTotal = pasosDesc.reduce((sum, p) => sum + p.valor, 0)
        const descuentoComercialUnitario = cantidadAnterior > 0 ? descuentoComercialTotal / cantidadAnterior : 0

        // Update cupon and comercial steps, and REMOVE promo step since no longer applies
        const pasosActualizados = (itemOriginal?.pasos_calculados || [])
          .filter(p => p.descripcion !== 'Promocion')
          .map(p => {
            if (p.descripcion === 'Cupon') {
              return {
                ...p,
                valor: cuponUnitario * qty
              }
            }
            if (p.descripcion !== 'Promocion') {
              return {
                ...p,
                valor: (descuentoComercialUnitario * qty)
              }
            }
            return p
          })

        // Get IGV percentage from the condition/step
        const pasoImpuesto = itemOriginal?.pasos_calculados?.find(p => p.codigo === 'Impuesto')
        const pctImpuesto = pasoImpuesto?.valor_original || 18

        const descuentoTotalUnitario = descuentoComercialUnitario + cuponUnitario
        const nuevoImpuesto = ((itemActualizado.precio_unit * qty) - (descuentoTotalUnitario * qty)) * (pctImpuesto / 100)
        const nuevoSubtotal = (itemActualizado.precio_unit * qty) - (descuentoTotalUnitario * qty)

        return updatedCart.map(i => {
          if (i.material.id !== materialId) return i
          return {
            ...i,
            pasos_calculados: pasosActualizados,
            descuento: descuentoTotalUnitario * qty,
            impuesto: nuevoImpuesto,
            subtotal: nuevoSubtotal,
            promocion_aplicada: undefined
          }
        })
      }

      return updatedCart
    })

    if (promoInfo) {
      setPromocionTotal(promoInfo)
    } else {
      setPromocionTotal(null)
    }

    // Update descuentoCupon state based on the updated cart
    const descuentoCuponActualizado = updatedCart.reduce((sum: number, item: CartItem) => {
      const pasoCupon = item.pasos_calculados?.find((p: any) => p.descripcion === 'Cupon')
      return sum + (pasoCupon?.valor || 0)
    }, 0)
    setDescuentoCupon(descuentoCuponActualizado)
    setDescuentoEsCupon(descuentoCuponActualizado > 0)

    // Also verify and update promocionTotal from the updated cart
    const promoPasoActualizado = updatedCart.reduce((maxDesc: number, item: CartItem) => {
      const p = item.pasos_calculados?.find((p: any) => p.descripcion === 'Promocion')
      return Math.max(maxDesc, p?.valor || 0)
    }, 0)
    if (promoPasoActualizado === 0 && promocionTotal) {
      console.log('[POS] updateQty - no promo in updated cart, clearing promocionTotal')
      setPromocionTotal(null)
    }
  }

  function removeFromCart(materialId: number) {
    setCart((prev) => {
      const newCart = prev.filter((i) => i.material.id !== materialId)

      // Recalculate promotions after removing item (combined quantity logic)
      if (promociones.length > 0 && newCart.length > 0) {
        let totalPromoDescuento = 0
        let activePromo: { nombre: string; valor: number; promoId: number; cantidad_regalo: number } | null = null

        // Group by promotion
        const promoGroups = new Map<number, { promo: any; items: CartItem[] }>()

        newCart.forEach(item => {
          const applicablePromos = promociones.filter(promo => {
            const materialMatch = promo.material_ids.includes(item.material.id)
            const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
            return materialMatch || categoriaMatch
          })

          if (applicablePromos.length > 0) {
            const promoId = applicablePromos[0].id
            if (!promoGroups.has(promoId)) {
              promoGroups.set(promoId, { promo: applicablePromos[0], items: [] })
            }
            promoGroups.get(promoId)!.items.push(item)
          }
        })

        const newCartWithPromo = newCart.map(item => {
          const applicablePromos = promociones.filter(promo => {
            const materialMatch = promo.material_ids.includes(item.material.id)
            const categoriaMatch = item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id)
            return materialMatch || categoriaMatch
          })

          if (applicablePromos.length === 0) return item

          const promo = applicablePromos[0]
          const promoGroup = promoGroups.get(promo.id)
          if (!promoGroup) return item

          const { cantidad_compra, cantidad_regalo } = promo
          const totalCantidad = promoGroup.items.reduce((sum, i) => sum + i.cantidad, 0)
          const divisionEnteraTotal = Math.floor(totalCantidad / cantidad_compra)

          if (divisionEnteraTotal > 0) {
            const sortedItems = [...promoGroup.items].sort((a, b) => {
              const precioA = a.precio_unit
              const precioB = b.precio_unit
              return precioA - precioB
            })

            // Only apply to ONE item (cheapest)
            const cheapestItem = sortedItems[0]

            if (item.material.id === cheapestItem.material.id) {
              const pasosActuales = item.pasos_calculados || []
              const descuentoComercialPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
              const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
              const descuentoCuponPaso = pasosActuales.find(p => p.codigo === 'Descuento' && p.descripcion === 'Cupon')
              const descuentoCuponUnitario = descuentoCuponPaso?.valor || 0
              const cantidadGratis = divisionEnteraTotal
              const valorDescuento = cantidadGratis * item.precio_unit
              totalPromoDescuento += valorDescuento
              activePromo = { nombre: promo.nombre, valor: totalPromoDescuento, promoId: promo.id, cantidad_regalo: cantidadGratis }

              const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
              const pasosConPromo = [
                ...pasosSinPromo,
                {
                  condicion_id: null,
                  esquema_id: null,
                  valor: valorDescuento,
                  codigo: 'Descuento',
                  descripcion: 'Promocion',
                  valor_original: cantidadGratis,
                  es_porcentaje: false
                }
              ]

              return {
                ...item,
                pasos_calculados: pasosConPromo,
                descuento: item.descuento,
                descuento_promocion: (item.descuento_promocion || 0) + valorDescuento,
                subtotal: item.subtotal - valorDescuento,
                promocion_aplicada: {
                  promoId: promo.id,
                  nombre: promo.nombre,
                  cantidad_regalo: cantidadGratis,
                  valor_descuento: valorDescuento
                }
              }
            }
          }

          // Remove existing promo
          const pasosActuales = item.pasos_calculados || []
          const pasosSinPromo = pasosActuales.filter(p => p.descripcion !== 'Promocion')
          const promoSteps = pasosActuales.filter(p => p.descripcion === 'Promocion')
          const descuentoPromo = promoSteps.reduce((sum, p) => sum + p.valor, 0)

          return {
            ...item,
            pasos_calculados: pasosSinPromo,
            descuento: item.descuento,
            descuento_promocion: Math.max(0, (item.descuento_promocion || 0) - descuentoPromo),
            subtotal: item.subtotal + descuentoPromo,
            promocion_aplicada: undefined
          }
        })

        if (activePromo) {
          console.log('[POS] removeFromCart (with promo) - setPromocionTotal:', activePromo)
          setPromocionTotal(activePromo)
        } else {
          console.log('[POS] removeFromCart (with promo) - activePromo is null, clearing promocionTotal')
          setPromocionTotal(null)
        }

        return newCartWithPromo
      }

      console.log('[POS] removeFromCart - no promos left, clearing promocionTotal')
      setPromocionTotal(null)
      return newCart
    })
  }

  const [cuponAplicado, setCuponAplicado] = useState<{ nombre: string; tipo: string; valor: number; acumulable: boolean } | null>(null)

  // Calcular totales - usar valores ya calculados en cada item (esquema aplicado en addToCart/updateQty)
  const calculateTotals = useCallback(() => {
    console.log('[POS totals] Using quantity x price from cart items. cart items:', cart.length, 'cuponAplicado:', cuponAplicado?.nombre)

    let subtotal = 0
    let descuentoComercial = 0
    let descuentoPromo = 0
    let descuentoCuponTotal = 0

    cart.forEach(item => {
      const pasosDesc = item.pasos_calculados?.filter(p => p.codigo === 'Descuento') || []
      const pasosComercial = pasosDesc.filter(p => p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
      const pasosPromo = pasosDesc.filter(p => p.descripcion === 'Promocion')
      const pasosCupon = pasosDesc.filter(p => p.descripcion === 'Cupon')

      // descuento_promocion ya es el valor total (no unitario)
      const promoItem = item.descuento_promocion || pasosPromo.reduce((sum, p) => sum + p.valor, 0)
      // cupon y comercial se guardan como valores totales, dividir por cantidad para obtener unitario y luego multiplicar
      const cuponUnitario = pasosCupon.reduce((sum, p) => sum + (p.valor / item.cantidad), 0)
      const cuponTotal = item.descuento_cupon || (cuponUnitario * item.cantidad)
      const comercTotal = item.descuento

      console.log('[POS totals] item:', item.material.codigo, 'cantidad:', item.cantidad, 'comercTotal:', comercTotal, 'promoItem:', promoItem, 'cuponTotal:', cuponTotal, 'descPromoField:', item.descuento_promocion)

      subtotal += item.precio_unit * item.cantidad
      descuentoComercial += comercTotal
      descuentoPromo += promoItem
      descuentoCuponTotal += cuponTotal
    })

    const impuestoTotal = cart.reduce((acc, item) => acc + item.impuesto, 0)
    const cuponNoAcumulable = cuponAplicado && !cuponAplicado.acumulable
    let descuentoTotal = 0
    let descuentoMostrar = 0

    if (cuponNoAcumulable) {
      descuentoTotal = descuentoComercial
      descuentoMostrar = descuentoComercial
    } else if (descuentoPromo > 0) {
      descuentoTotal = descuentoComercial + descuentoPromo
      descuentoMostrar = descuentoComercial + descuentoPromo
    } else if (descuentoCuponTotal > 0) {
      descuentoTotal = descuentoComercial + descuentoCuponTotal
      descuentoMostrar = descuentoComercial + descuentoCuponTotal
    } else {
      descuentoTotal = descuentoComercial
      descuentoMostrar = descuentoComercial
    }

    const total = subtotal - descuentoComercial - descuentoPromo - descuentoCuponTotal + impuestoTotal
    console.log('[POS totals] Final - subtotal:', subtotal, 'descComerc:', descuentoComercial, 'descPromo:', descuentoPromo, 'descCupon:', descuentoCuponTotal, 'descTotal:', descuentoMostrar, 'impuesto:', impuestoTotal, 'total:', total)

    return { subtotal, descuento: descuentoMostrar, descuentoComercial, descuentoPromo, descuentoCupon: descuentoCuponTotal, impuesto: impuestoTotal, total }
  }, [cart, cuponAplicado])

  const { subtotal, descuento, descuentoComercial, descuentoPromo, descuentoCupon: descuentoCuponCalculado, impuesto, total } = calculateTotals()
  console.log('[POS render] Values - descuento:', descuento, 'cuponAplicado:', cuponAplicado?.nombre, 'descuentoEsCupon:', descuentoEsCupon, 'descuentoCupon:', descuentoCuponCalculado)

  const removeCupon = useCallback(() => {
    console.log('[POS] removeCupon called')
    const nuevoCarrito = cart.map((item) => {
      let pasos = item.pasos_calculados || []

      const tieneCupon = pasos.some((p: any) => p.descripcion === 'Cupon')
      if (!tieneCupon) return item

      const descuentoComercialInfo = descuentos.get(item.material.id)
      const pasoPromo = pasos.find((p: any) => p.descripcion === 'Promocion')
      console.log('[POS] restore, item:', item.material.codigo, 'descuentoComercialInfo:', descuentoComercialInfo, 'pasoPromo:', pasoPromo)

      // Only remove cupon, keep promo and commercial discount
      pasos = pasos.filter((p: any) => p.descripcion !== 'Cupon')

      // Recalculate promo value if exists (without coupon)
      if (pasoPromo) {
        const cantidadGratis = pasoPromo.valor_original || 1
        const descuentoComercialPaso = pasos.find((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
        const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
        const nuevoValorPromo = cantidadGratis * (item.precio_unit - (descuentoComercialUnitario / item.cantidad))
        pasoPromo.valor = nuevoValorPromo
        console.log('[POS] recalculating promo - nuevoValorPromo:', nuevoValorPromo, 'precio:', item.precio_unit, 'descComerc:', descuentoComercialUnitario)
      }

      let descuentoItem = 0
      if (descuentoComercialInfo) {
        const valorNumero = Number(descuentoComercialInfo.valor) || 0
        const valorDescuentoUnitario = descuentoComercialInfo.porcentaje
          ? item.precio_unit * (valorNumero / 100)
          : valorNumero
        console.log('[POS] restoring discount - unitario:', valorDescuentoUnitario, 'valor original:', valorNumero)
        let encontrado = false
        pasos = pasos.map((p: any) => {
          if (p.codigo === 'Descuento' && p.valor === 0 && !encontrado) {
            encontrado = true
            return { ...p, valor: valorDescuentoUnitario, valor_original: valorNumero }
          }
          return p
        })
        descuentoItem = valorDescuentoUnitario
      } else {
        descuentoItem = pasos.filter((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon' && p.valor > 0).reduce((sum: number, p: any) => sum + p.valor, 0)
      }

      const descuentoComercialDelItem = pasos.filter((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)
      const descuentoPromoDelItem = pasos.filter((p: any) => p.descripcion === 'Promocion').reduce((sum: number, p: any) => sum + p.valor, 0)
      const descuentoCuponDelItem = pasos.filter((p: any) => p.descripcion === 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)

      const pasosDescuento = pasos.filter((p: any) => p.codigo === 'Descuento')
      const descuentoUnitario = pasosDescuento.reduce((sum: number, p: any) => sum + p.valor, 0)
      // base = cantidad * precio - descuento total
      const baseImponible = (item.precio_unit * item.cantidad) - descuentoUnitario
      const nuevoImpuesto = baseImponible * (igvPorcentaje / 100)

      const nuevoSubtotal = item.precio_unit * item.cantidad

      const promoActualizada = pasoPromo && item.promocion_aplicada
        ? { ...item.promocion_aplicada, valor_descuento: pasoPromo.valor }
        : undefined
      return {
        ...item,
        pasos_calculados: pasos,
        descuento: descuentoComercialDelItem,
        descuento_cupon: descuentoCuponDelItem,
        descuento_promocion: descuentoPromoDelItem,
        impuesto: nuevoImpuesto,
        subtotal: nuevoSubtotal,
        promocion_aplicada: promoActualizada
      }
    })
    setCart(nuevoCarrito)
    setCuponAplicado(null)
    setDescuentoCupon(0)
    setDescuentoEsCupon(false)
    setMaterialesValidos([])
    toast.success('Cupón eliminado')
  }, [cart, descuentos])

  async function applyCupon() {
    const tieneCuponActivo = cart.some((item: any) => {
      return item.pasos_calculados?.some((p: any) => p.descripcion === 'Cupon' && p.valor > 0)
    })
    console.log('[POS] check cupon - cupon value:', cupon, 'cuponAplicado:', cuponAplicado, 'tieneCuponActivo:', tieneCuponActivo)

    if (!cupon.trim()) {
      if (tieneCuponActivo) {
        removeCupon()
      }
      return
    }
    toast.loading('Validando cupón...')

    const now = new Date()
    const cuponEncontrado = cupones.find(c =>
      c.nombre.toUpperCase() === cupon.toUpperCase() &&
      c.activo !== false &&
      new Date(c.fecha_inicio) <= now &&
      new Date(c.fecha_fin) >= now
    )

    if (cuponEncontrado) {
      const empresaId = getAuthStore().user?.empresaId
      let cuponCategorias: Array<{ categoria_id: number }> = []
      let cuponDetalles: Array<{ material_id: number }> = []

      try {
        const [catRes, detRes] = await Promise.all([
          apiFetch(`/api/precios/cupones/${cuponEncontrado.id}/categorias`),
          apiFetch(`/api/precios/cupones/${cuponEncontrado.id}/detalles`)
        ])
        const catJson = await catRes.json()
        const detJson = await detRes.json()
        cuponCategorias = catJson.data || []
        cuponDetalles = detJson.data || []
        console.log('[POS] cupon categorias:', cuponCategorias.length, 'detalles:', cuponDetalles.length, 'detallesdata:', cuponDetalles, 'cartMaterialIds:', cart.map(i => i.material.id))
      } catch (e) {
        console.error('[POS] Error fetching cupon detalle:', e)
      }

      const tieneRestricciones = cuponCategorias.length > 0 || cuponDetalles.length > 0

      let materialesValidosLocal: number[] = []
      if (tieneRestricciones) {
        const cartMaterialIds = cart.map(item => item.material.id)
        const cartCategoriaIds = cart.map(item => item.material.categoria_id).filter(Boolean) as number[]

        if (cuponDetalles.length > 0) {
          const allowedMaterialIds = cuponDetalles.map((d: any) => d.material_id)
          const cartMatching = cartMaterialIds.filter(id => allowedMaterialIds.includes(id))
          if (cartMatching.length === 0) {
            toast.dismiss()
            toast.error('El cupón no aplica a los materiales del carrito')
            setCupon('')
            return
          }
          materialesValidosLocal = allowedMaterialIds
          console.log('[POS] materiales válidos para cupon (all from detail):', materialesValidosLocal)
        } else if (cuponCategorias.length > 0) {
          const allowedCategoriaIds = cuponCategorias.map((c: any) => c.categoria_id)
          const matchingCategorias = cartCategoriaIds.filter(id => allowedCategoriaIds.includes(id))
          if (matchingCategorias.length === 0) {
            toast.dismiss()
            toast.error('El cupón no aplica a las categorías de los materiales del carrito')
            setCupon('')
            return
          }
          const itemsInCategoria = cart.filter(item => item.material.categoria_id && allowedCategoriaIds.includes(item.material.categoria_id))
          materialesValidosLocal = itemsInCategoria.map(item => item.material.id)
          console.log('[POS] categorías válidas para cupon:', matchingCategorias, 'materiales:', materialesValidosLocal)
        }
      }

      let cuponValor = 0
      if (cuponEncontrado.tipo === 'PORCENTAJE') {
        cuponValor = subtotal * (cuponEncontrado.valor / 100)
      } else {
        cuponValor = cuponEncontrado.valor
      }

      if (!cuponEncontrado.acumulable) {
        const materialesValidosParaCalculo = tieneRestricciones ? materialesValidosLocal : []
        const pasoCuponEsquemaLocal = pasosEsquema.find(p => p.descripcion_corta === 'Cupon')
        const pasoPromoEsquemaLocal = pasosEsquema.find(p => p.descripcion_corta === 'Promocion')
        let nuevoCarrito = cart.map((item, i) => {
          let pasos = item.pasos_calculados || []

          console.log('[POS applyCupon] item ANTES - pasos:', pasos.map(p => ({ codigo: p.codigo, desc: p.descripcion, valor: p.valor })))

          // Remove only cupon, keep promo and commercial discount
          pasos = pasos.filter((p: any) => p.descripcion !== 'Cupon')

          console.log('[POS applyCupon] item DESPUES filter - pasos:', pasos.map(p => ({ codigo: p.codigo, desc: p.descripcion, valor: p.valor })))

          const itemSubtotal = item.precio_unit * item.cantidad
          let cuponItemValor = 0
          if (cuponEncontrado.tipo === 'PORCENTAJE') {
            cuponItemValor = item.precio_unit * (cuponEncontrado.valor / 100)
          } else {
            cuponItemValor = (cuponValor / (materialesValidosParaCalculo.length > 0 ? materialesValidosParaCalculo.length : cart.length))
          }

          const descuentoComercial = pasos.find((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion')
          const descuentoComercialUnitario = descuentoComercial ? (descuentoComercial.valor || 0) / item.cantidad : 0

          console.log('[POS applyCupon] DEBUG - cuponItemValor:', cuponItemValor, 'cuponValor:', cuponValor, 'tipo:', cuponEncontrado.tipo, 'descuentoComercialUnitario:', descuentoComercialUnitario, 'descuentoComercial:', descuentoComercial?.valor, 'itemCantidad:', item.cantidad)

          let usarCuponParaPromo = false
          if (descuentoComercialUnitario > cuponItemValor) {
            toast.error('Cupón descartado: el descuento comercial es mayor')
            usarCuponParaPromo = false
            pasos = pasos.map((p: any) => {
              if (p.codigo === 'Descuento' && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion') {
                return p
              }
              return p
            })
            pasos = [...pasos, {
              condicion_id: pasoCuponEsquemaLocal?.condicion_id || null,
              esquema_id: null,
              valor: 0,
              codigo: 'Descuento',
              descripcion: 'Cupon',
              valor_original: cuponEncontrado.tipo === 'PORCENTAJE' ? cuponEncontrado.valor : cuponItemValor,
              es_porcentaje: cuponEncontrado.tipo === 'PORCENTAJE'
            }]
          } else {
            usarCuponParaPromo = true
            pasos = pasos.map((p: any) => {
              if (p.codigo === 'Descuento' && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion') {
                return { ...p, valor: 0 }
              }
              return p
            })
            pasos = [...pasos, {
              condicion_id: pasoCuponEsquemaLocal?.condicion_id || null,
              esquema_id: null,
              valor: cuponValor,
              codigo: 'Descuento',
              descripcion: 'Cupon',
              valor_original: cuponEncontrado.tipo === 'PORCENTAJE' ? cuponEncontrado.valor : cuponItemValor,
              es_porcentaje: cuponEncontrado.tipo === 'PORCENTAJE'
            }]
          }

          const promoAplicableLocal = promociones.find(promo =>
            promo.material_ids.includes(item.material.id) ||
            (item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id))
          )
          const pasoPromo = promoAplicableLocal ? pasos.find((p: any) => p.descripcion === 'Promocion') : undefined
          const descuentoComercialPromo = pasos.find((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion')
          const descuentoComercialPromoUnitario = descuentoComercialPromo ? (descuentoComercialPromo.valor || 0) / item.cantidad : 0
          const cuponUnitario = cuponEncontrado.tipo === 'PORCENTAJE' ? item.precio_unit * (cuponEncontrado.valor / 100) : 0
          if (pasoPromo && promoAplicableLocal && usarCuponParaPromo) {
            const cantidadGratis = pasoPromo.valor_original || 1
            const nuevoValorPromo = cantidadGratis * (item.precio_unit - descuentoComercialPromoUnitario - cuponUnitario)
            pasoPromo.valor = nuevoValorPromo
          } else if (pasoPromo && promoAplicableLocal && !usarCuponParaPromo && descuentoComercialPromoUnitario > 0) {
            const cantidadGratis = pasoPromo.valor_original || 1
            const nuevoValorPromo = cantidadGratis * (item.precio_unit - descuentoComercialPromoUnitario)
            pasoPromo.valor = nuevoValorPromo
          }

          const descuentoItem = pasos.filter((p: any) => p.codigo === 'Descuento').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoComercialDelItem = pasos.filter((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoPromoDelItem = pasos.filter((p: any) => p.descripcion === 'Promocion').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoCuponDelItem = pasos.filter((p: any) => p.descripcion === 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)

          console.log('[POS applyCupon] BEFORE IGV calc - precio:', item.precio_unit, 'cant:', item.cantidad, 'itemSubtotal:', item.precio_unit * item.cantidad, 'descuentoComerc:', descuentoComercialDelItem, 'descPromo:', descuentoPromoDelItem, 'descCupon:', descuentoCuponDelItem)
          // IGV = (precio * cantidad - descuentoItem por unidad) * igvPorcentaje
          const baseImponible = (item.precio_unit * item.cantidad) - descuentoItem
          const nuevoImpuesto = baseImponible * (igvPorcentaje / 100)

          console.log('[POS applyCupon] IGV - base:', baseImponible, 'IGV:', nuevoImpuesto)

          // Update IGV paso in pasos_calculados
          pasos = pasos.map((p: any) => {
            if (p.codigo === 'Impuesto' && p.descripcion === 'IGV') {
              return { ...p, valor: nuevoImpuesto, valor_original: igvPorcentaje }
            }
            return p
          })

          const nuevoSubtotal = item.precio_unit * item.cantidad

          return {
            ...item,
            pasos_calculados: pasos,
            descuento: descuentoComercialDelItem,
            descuento_cupon: descuentoCuponDelItem,
            descuento_promocion: descuentoPromoDelItem,
            impuesto: nuevoImpuesto,
            subtotal: nuevoSubtotal,
            promocion_aplicada: (pasoPromo && pasoPromo.valor > 0 && item.promocion_aplicada)
              ? { ...item.promocion_aplicada, valor_descuento: pasoPromo.valor }
              : undefined
          }
        })
        setCart(nuevoCarrito)
        console.log('[POS applyCupon] after setCart, primer item.impuesto:', nuevoCarrito[0]?.impuesto)
        const descuentoTotalCupon = nuevoCarrito.reduce((sum: number, item: CartItem) => {
          const pasoCupon = item.pasos_calculados?.find((p: any) => p.descripcion === 'Cupon' && p.valor > 0)
          return sum + (pasoCupon?.valor || 0)
        }, 0)
        const primerItem = nuevoCarrito[0]
        const pasoCuponActivo = primerItem?.pasos_calculados?.find((p: any) => p.descripcion === 'Cupon' && p.valor > 0)
        setDescuentoCupon(descuentoTotalCupon)
        setDescuentoEsCupon(!!pasoCuponActivo)
        setCupon('')
      } else {
        const materialesValidosParaCalculo = tieneRestricciones ? materialesValidosLocal : []
        const pasoCuponEsquemaAcum = pasosEsquema.find(p => p.descripcion_corta === 'Cupon')
        const pasoPromoEsquemaAcum = pasosEsquema.find(p => p.descripcion_corta === 'Promocion')
        let nuevoCarrito = cart.map((item, i) => {
          let pasos = item.pasos_calculados || []

          // Remove only existing cupon, keep promo and commercial discount
          pasos = pasos.filter((p: any) => p.descripcion !== 'Cupon')

          const itemSubtotal = item.precio_unit * item.cantidad
          let cuponItemValor = 0
          const materialCalifica = materialesValidosParaCalculo.length === 0 || materialesValidosParaCalculo.includes(item.material.id)
          if (materialCalifica) {
            if (cuponEncontrado.tipo === 'PORCENTAJE') {
              cuponItemValor = (item.precio_unit * item.cantidad) * (cuponEncontrado.valor / 100)
            } else {
              cuponItemValor = (cuponValor / (materialesValidosParaCalculo.length > 0 ? materialesValidosParaCalculo.length : cart.length))
            }
          }

          // Recalculate promotion value if exists (with new coupon) - solo si el cupón aplica a este material Y el material está afecto a LA promocion
          const promoAplicable = promociones.find(promo =>
            promo.material_ids.includes(item.material.id) ||
            (item.material.categoria_id && promo.categoria_ids.includes(item.material.categoria_id))
          )
          const pasoPromo = promoAplicable ? pasos.find((p: any) => p.descripcion === 'Promocion') : undefined
          let nuevoValorPromo = 0
          if (pasoPromo && promoAplicable && materialCalifica && cuponItemValor > 0) {
            const cantidadGratis = pasoPromo.valor_original || 1
            const descuentoComercialPaso = pasos.find((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon')
            const descuentoComercialUnitario = descuentoComercialPaso?.valor || 0
            nuevoValorPromo = cantidadGratis * (item.precio_unit - descuentoComercialUnitario - (cuponItemValor / item.cantidad))
            console.log('[POS] recalc promo - tiene promo, promoAplicable:', !!promoAplicable, 'materialCalifica:', materialCalifica, 'cuponItemValor:', cuponItemValor, 'nuevoValorPromo:', nuevoValorPromo)
            pasoPromo.valor = nuevoValorPromo
          }

          pasos = [...pasos, {
            condicion_id: pasoCuponEsquemaAcum?.condicion_id || null,
            esquema_id: null,
            valor: cuponItemValor,
            codigo: 'Descuento',
            descripcion: 'Cupon',
            valor_original: cuponEncontrado.tipo === 'PORCENTAJE' ? cuponEncontrado.valor : cuponItemValor,
            es_porcentaje: cuponEncontrado.tipo === 'PORCENTAJE'
          }]

          const descuentoItem = pasos.filter((p: any) => p.codigo === 'Descuento').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoComercialDelItem = pasos.filter((p: any) => p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoPromoDelItem = pasos.filter((p: any) => p.descripcion === 'Promocion').reduce((sum: number, p: any) => sum + p.valor, 0)
          const descuentoCuponDelItem = pasos.filter((p: any) => p.descripcion === 'Cupon').reduce((sum: number, p: any) => sum + p.valor, 0)

          // base = cantidad * precio - descuento total
          const baseImponible = (item.precio_unit * item.cantidad) - descuentoItem
          //const baseImponible = itemSubtotal - (descuentoItem * item.cantidad)
          const nuevoImpuesto = baseImponible * (igvPorcentaje / 100)

          console.log('[POS applyCuponACUM] IGV - base:', baseImponible, 'IGV:', nuevoImpuesto)

          // Update IGV paso in pasos_calculados
          pasos = pasos.map((p: any) => {
            if (p.codigo === 'Impuesto' && p.descripcion === 'IGV') {
              return { ...p, valor: nuevoImpuesto, valor_original: igvPorcentaje }
            }
            return p
          })

          //const nuevoSubtotal = baseImponible + nuevoImpuesto
          const nuevoSubtotal = item.precio_unit * item.cantidad

          // Update promocion_aplicada if exists
          const promoActualizada = (pasoPromo && nuevoValorPromo > 0 && item.promocion_aplicada)
            ? { ...item.promocion_aplicada, valor_descuento: pasoPromo.valor }
            : undefined

          return {
            ...item,
            pasos_calculados: pasos,
            descuento: descuentoComercialDelItem,
            descuento_cupon: descuentoCuponDelItem,
            descuento_promocion: descuentoPromoDelItem,
            impuesto: nuevoImpuesto,
            subtotal: nuevoSubtotal,
            promocion_aplicada: promoActualizada
          }
        })
        setCart(nuevoCarrito)

        // Update promocionTotal - mantener el valor original si existe aunque sea 0
        const itemConPromo = nuevoCarrito.find((item) => item.pasos_calculados?.some((p: any) => p.descripcion === 'Promocion'))
        if (itemConPromo) {
          const pasoPromo = itemConPromo.pasos_calculados?.find((p: any) => p.descripcion === 'Promocion')
          if (pasoPromo) {
            const promoInfo: { nombre: string; valor: number; promoId: number; cantidad_regalo: number } = {
              nombre: pasoPromo.descripcion || 'Promocion',
              valor: pasoPromo.valor || 0,
              promoId: itemConPromo.promocion_aplicada?.promoId || 0,
              cantidad_regalo: pasoPromo.valor_original || 0
            }
            console.log('[POS] setPromocionTotal - promoInfo:', promoInfo)
            setPromocionTotal(promoInfo)
          } else {
            setPromocionTotal(null)
          }
        } else {
          setPromocionTotal(null)
        }

        let descuentoTotalCupon = 0
        for (const item of nuevoCarrito) {
          const pasoCupon = item.pasos_calculados?.find((p: any) => p.descripcion === 'Cupon')
          descuentoTotalCupon += pasoCupon?.valor || 0
        }
        setDescuentoCupon(descuentoTotalCupon)
        setDescuentoEsCupon(descuentoTotalCupon > 0)
      }

      setCuponAplicado(cuponEncontrado)
      setMaterialesValidos(tieneRestricciones ? materialesValidosLocal : [])
      toast.dismiss()
      toast.success(`Cupón aplicado: ${cuponEncontrado.tipo === 'PORCENTAJE' ? `${cuponEncontrado.valor}%` : formatCurrency(cuponEncontrado.valor, { symbol: monedaSimbolo })} de descuento`)
    } else {
      setDescuentoCupon(0)
      setCuponAplicado(null)
      setDescuentoEsCupon(false)
      setMaterialesValidos([])
      toast.dismiss()
      toast.error('Cupón inválido o expirado')
    }
  }

  async function procesarVenta(estado: 'procesada') {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return }
    if (!currentSucursal) { toast.error('No hay sucursal seleccionada'); return }
    if (!defaultAlmacenId) { toast.error('No hay almacén configurado'); return }
    if (!defaultMonedaId) { toast.error('No hay moneda configurada'); return }

    // Validar datos del cliente
    if (!numeroIdentificacion || numeroIdentificacion.trim() === '') {
      toast.error('Ingrese el número de identificación del cliente')
      return
    }
    if (!docIdentificacion?.id) {
      toast.error('Seleccione el tipo de documento de identificación')
      return
    }
    if (!clienteNombreFull || clienteNombreFull.trim() === '') {
      toast.error('Ingrese el nombre del cliente')
      return
    }

    // Validar medio de pago
    const totalPagado = mediosPagoSeleccionados.reduce((sum, m) => sum + m.monto, 0)
    if (mediosPagoSeleccionados.length === 0) {
      toast.error('Seleccione al menos un medio de pago')
      return
    }
    if (totalPagado < total) {
      toast.error('El monto pagado es menor al total de la venta')
      return
    }

    setProcessing(true)
    try {
      const payload = {
        numero_pedido: generateOrderNumber(),
        cliente_id: clienteId,
        sucursal_id: currentSucursal.id,
        clase_pedido_id: clasePedidoId,
        moneda_id: defaultMonedaId,
        documento_identificacion_id: docIdentificacion?.id,
        numero_identificacion: numeroIdentificacion,
        nombre: clienteNombreFull,
        nombres_completos: nombresCompletos,
        apellidos_completos: apellidosCompletos,
        direccion: direccion,
        ubigeo: ubigeo,
        departamento: departamento,
        provincia: provincia,
        distrito: distrito,
        observaciones: observaciones,
        estado,
        subtotal,
        impuesto: impuesto,
        descuento: descuentoComercial,
        descuento_cupon: descuentoCuponCalculado,
        descuento_promocion: promocionTotal?.valor || 0,
        total,
        medios_pago: mediosPagoSeleccionados.map(mp => ({
          medio_pago_id: mp.medioPagoId,
          importe: mp.monto,
          numero_operacion: mp.numeroOperacion || null
        })),
        detalles: cart.map((i) => {
          const pasoCupon = i.pasos_calculados?.find(p => p.descripcion === 'Cupon' && p.valor > 0)
          const pasoPromo = i.pasos_calculados?.find(p => p.descripcion === 'Promocion' && p.valor > 0)
          const pasoDescuentoComercial = i.pasos_calculados?.find(p =>
            p.codigo === 'Descuento' && p.descripcion !== 'Promocion' && p.descripcion !== 'Cupon'
          )
          const descuentoComercial = (pasoDescuentoComercial?.valor || 0)
          const subtotalNeto = i.subtotal - i.impuesto
          return {
            material_id: i.material.id,
            cantidad: i.cantidad,
            precio_unit: i.precio_unit,
            descuento: descuentoComercial,
            descuento_cupon: pasoCupon?.valor || 0,
            descuento_promocion: pasoPromo?.valor || 0,
            cupon_id: cuponAplicado ? cupones.find(c => c.nombre === cuponAplicado.nombre)?.id || null : null,
            promocion_id: i.promocion_aplicada?.promoId || null,
            impuesto: i.impuesto,
            subtotal: subtotalNeto,
            almacen_id: i.almacen_id || defaultAlmacenId,
            unidad_medida_id: i.unidad_medida_id || 1,
            condiciones: (i.pasos_calculados || []).filter(p => {
              const isIGV = p.codigo === 'Impuesto' && p.descripcion === 'IGV'
              return p.esquema_id || p.descripcion === 'Cupon' || p.descripcion === 'Promocion' || isIGV
            }).map(p => {
              const isIGV = p.codigo === 'Impuesto' && p.descripcion === 'IGV'
              const importe = isIGV && p.valor === 0 ? i.impuesto : p.valor
              return {
                condicion_id: p.condicion_id,
                esquema_id: p.esquema_id,
                valor_condicion: p.valor_original,
                simbolo: p.es_porcentaje ? '%' : '$',
                descripcion_corta: p.descripcion,
                tipo: p.codigo,
                importe: importe
              }
            })
          }
        }),
      }
      console.log('[POS procesarVenta] Payload:', JSON.stringify(payload, null, 2))
      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('¡Venta procesada exitosamente!')
      setCart([])
      setCupon('')
      setDescuentoCupon(0)
      setCuponAplicado(null)
      setDescuentoEsCupon(false)
      setNif('')
      setClienteNombre('')
      setClienteId(null)
      setMediosPagoSeleccionados([])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setProcessing(false)
    }
  }

  const filteredMateriales = materiales.filter((m) =>
    m.descripcion.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Punto de Venta" />

      <div className="flex-1 flex overflow-hidden">
        {/* Products grid */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-1/2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por código o nombre..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            {categorias.length > 0 && (
              <div className="flex flex-wrap gap-1.5 flex-1">
                <button
                  onClick={() => setCategoriaSeleccionada(null)}
                  className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${categoriaSeleccionada === null
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${categoriaSeleccionada === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {cat.descripcion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start overflow-y-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 animate-pulse border border-slate-200 dark:border-slate-800">
                  <div className="w-full h-28 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start overflow-y-auto pb-4">
              {filteredMateriales.map((m) => {
                const promo = promociones.find(p => p.material_ids.includes(m.id) || (m.categoria_id && p.categoria_ids.includes(m.categoria_id)))
                const desc = descuentos.get(m.id)
                const descBadge = desc ? (desc.porcentaje ? `${desc.valor}% off` : `${formatCurrency(desc.valor, { symbol: desc.simbolo })} off`) : ''
                const precio = preciosDinamicos.get(m.id) ?? 0
                return (
                  <button key={m.id} onClick={() => addToCart(m)}
                    disabled={!precio || precio <= 0}
                    className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left group relative">
                    {promo && (
                      <span className="absolute top-2 left-2 z-10 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full shadow">
                        {promo.cantidad_compra}x{promo.cantidad_regalo}
                      </span>
                    )}
                    {descBadge && (
                      <span className="absolute top-2 right-2 z-10 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full shadow">
                        {descBadge}
                      </span>
                    )}
                    <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {m.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imagen_url} alt={m.descripcion} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-slate-300">inventory_2</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-0.5">{m.codigo}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                      {m.descripcion}
                    </p>
                    <p className="text-base font-bold text-primary">{mounted ? formatCurrency(precio, { symbol: monedaSimbolo }) : '...'}</p>
                    <p className="text-xs text-slate-400 mt-1">Stock: {Number(m.stock_actual)}</p>
                  </button>
                )
              })}

              {filteredMateriales.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                  <p>No se encontraron productos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="w-88 xl:w-[28rem] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                {cart.length > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                )}
              </h3>
              <button onClick={() => setMostrarCliente(!mostrarCliente)} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-base">{mostrarCliente ? 'shopping_cart' : 'person'}</span>
                {mostrarCliente ? 'Carrito' : (clienteNombreFull || clienteNombre || (nombresCompletos + ' ' + apellidosCompletos).trim() || 'Cliente')}
              </button>
            </div>
          </div>

          {/* Cart items or Client form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mostrarCliente ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 tracking-wider">DOC. IDENTIDAD</label>
                  <DocumentoIdentificacionSelect
                    value={docIdentificacion?.id}
                    onSelect={(d) => setDocIdentificacion({ id: d.id, abreviatura: d.abreviatura })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 tracking-wider">NÚMERO DOCUMENTO</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={numeroIdentificacion}
                      onChange={(e) => setNumeroIdentificacion(e.target.value)}
                      onBlur={handleBuscarCliente}
                      placeholder="Número de documento"
                      className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                {docIdentificacion?.abreviatura === 'RUC' ? (
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 tracking-wider">RAZÓN SOCIAL</label>
                    <input
                      type="text"
                      value={clienteNombreFull}
                      onChange={(e) => setClienteNombreFull(e.target.value)}
                      placeholder="Nombre o razón social"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 tracking-wider">NOMBRES</label>
                      <input
                        type="text"
                        value={nombresCompletos}
                        onChange={(e) => setNombresCompletos(e.target.value)}
                        placeholder="Nombres"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 tracking-wider">APELLIDOS</label>
                      <input
                        type="text"
                        value={apellidosCompletos}
                        onChange={(e) => setApellidosCompletos(e.target.value)}
                        placeholder="Apellidos"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 tracking-wider">DIRECCIÓN</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 tracking-wider">UBIGEO</label>
                    <input
                      type="text"
                      value={ubigeo}
                      onChange={(e) => setUbigeo(e.target.value)}
                      placeholder="Ubigeo"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 tracking-wider">DEPARTAMENTO</label>
                    <input
                      type="text"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      placeholder="Departamento"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 tracking-wider">PROVINCIA</label>
                    <input
                      type="text"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      placeholder="Provincia"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 tracking-wider">DISTRITO</label>
                    <input
                      type="text"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                      placeholder="Distrito"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 tracking-wider">OBSERVACIONES</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Venta POS"
                    rows={2}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-4xl block mb-2">shopping_cart</span>
                <p className="text-xs">Selecciona productos del catálogo</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.material.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <button onClick={() => removeFromCart(item.material.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate flex-1">
                          {item.material.descripcion}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateQty(item.material.id, item.cantidad - 1)}
                            className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                            <span className="material-symbols-outlined text-[10px]">remove</span>
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                          <button onClick={() => updateQty(item.material.id, item.cantidad + 1)}
                            className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                            <span className="material-symbols-outlined text-[10px]">add</span>
                          </button>
                          <p className="font-bold text-slate-900 dark:text-white text-xs ml-1 min-w-[60px] text-right">
                            {formatCurrency(item.precio_unit * item.cantidad, { symbol: monedaSimbolo })}
                          </p>
                        </div>
                      </div>
                      <div className="-mt-0.5">
                        <span className="text-[10px] text-slate-400 block">
                          {mounted ? formatCurrency(item.precio_unit, { symbol: monedaSimbolo }) : '...'} c/u
                        </span>
                        {(() => {
                          console.log('[POS render label] item:', item.material.codigo, 'pasos:', item.pasos_calculados?.map(p => ({ codigo: p.codigo, desc: p.descripcion, valor: p.valor })))
                          const descuentoComercial = item.pasos_calculados?.find(p =>
                            p.codigo === 'Descuento' && p.valor > 0 && p.descripcion !== 'Cupon' && p.descripcion !== 'Promocion'
                          )
                          const descuentoCupon = item.pasos_calculados?.find(p =>
                            p.codigo === 'Descuento' && p.descripcion === 'Cupon' && p.valor > 0
                          )
                          const descuentoPromo = item.pasos_calculados?.find(p =>
                            p.codigo === 'Descuento' && p.descripcion === 'Promocion' && p.valor > 0
                          )
                          const promo = item.promocion_aplicada
                          const mostrarDescuentoComercial = !!descuentoComercial
                          const mostrarDescuentoCupon = !!descuentoCupon
                          const mostrarPromo = !!descuentoPromo || !!promo
                          if (!mostrarDescuentoComercial && !mostrarDescuentoCupon && !mostrarPromo) return null
                          return (
                            <>
                              {mostrarDescuentoCupon && descuentoCupon && (
                                <span className="text-[9px] text-red-500 block">
                                  Dscto. Cupón {descuentoCupon.valor_original || ''}{descuentoCupon.es_porcentaje ? '%' : ''}
                                </span>
                              )}
                              {mostrarDescuentoComercial && descuentoComercial && (
                                <span className="text-[9px] text-red-500 block">
                                  {descuentoComercial.es_porcentaje
                                    ? `${descuentoComercial.valor_original || 0}% off`
                                    : `${formatCurrency(descuentoComercial.valor, { symbol: monedaSimbolo })} off`
                                  }
                                </span>
                              )}
                              {mostrarPromo && (
                                <span className="text-[9px] text-green-600 block">
                                  {promo?.nombre || `Promoción aplicada`}
                                </span>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals and actions */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Coupon */}
              <div className="flex gap-2 items-end pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex-1 space-y-1">
                  <label className="text-[8px] font-bold text-slate-500 tracking-wider">CUPÓN</label>
                  <select value={cupon} onChange={(e) => {
                    const nuevoCupon = e.target.value
                    setCupon(nuevoCupon)
                    console.log('[POS] onChange select, nuevoCupon:', nuevoCupon, 'cuponAplicado:', cuponAplicado)
                    if (nuevoCupon === '') {
                      const hayCuponEnCarrito = cart.some((item: any) =>
                        item.pasos_calculados?.some((p: any) => p.descripcion === 'Cupon' && p.valor > 0)
                      )
                      console.log('[POS] hayCuponEnCarrito:', hayCuponEnCarrito)
                      if (hayCuponEnCarrito || cuponAplicado) {
                        removeCupon()
                      }
                    }
                  }}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Seleccionar cupón</option>
                    {cupones.map((c) => {
                      const ahora = new Date()
                      const activo = c.activo !== false && new Date(c.fecha_inicio) <= ahora && new Date(c.fecha_fin) >= ahora
                      if (!activo) return null
                      return (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre} ({c.tipo === 'PORCENTAJE' ? `${c.valor}%` : formatCurrency(c.valor, { symbol: monedaSimbolo })})
                        </option>
                      )
                    })}
                  </select>
                </div>
                <button onClick={applyCupon} disabled={!cupon}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium hover:bg-slate-200 transition-colors h-[38px] disabled:opacity-50">
                  Aplicar
                </button>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, { symbol: monedaSimbolo })}</span>
                </div>
                {descuentoComercial > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Descuento Comercial</span>
                    <span>-{formatCurrency(descuentoComercial, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
                {promocionTotal && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Descuento Promocional{promocionTotal.cantidad_regalo > 0 ? ` (${promocionTotal.cantidad_regalo} gratis)` : ` (${promocionTotal.nombre})`}</span>
                    <span>-{formatCurrency(promocionTotal.valor, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
                {(cuponAplicado && descuentoCuponCalculado > 0) && (
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Descuento Cupón ({cuponAplicado.nombre}{cuponAplicado.tipo === 'PORCENTAJE' ? ` ${cuponAplicado.valor}%` : cuponSimbolo})</span>
                    <span>-{formatCurrency(descuentoCuponCalculado, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{mounted ? formatCurrency(total, { symbol: monedaSimbolo }) : '...'}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>IGV</span>
                  <span>{formatCurrency(impuesto || 0, { symbol: monedaSimbolo })}</span>
                </div>
              </div>

              {/* Métodos de Pago - Botones de selección */}
              {cart.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Medios de Pago</div>
                  <div className="flex flex-wrap gap-2">
                    {mediosPago.map((mp) => {
                      const isSelected = mediosPagoSeleccionados.some(m => m.medioPagoId === mp.id)
                      const getMedioPagoIcon = (desc: string) => {
                        const d = desc.toLowerCase()
                        if (d.includes('efectivo') || d.includes('cash')) return 'payments'
                        if (d.includes('tarjeta') || d.includes('credito') || d.includes('debito') || d.includes('visa') || d.includes('master')) return 'credit_card'
                        if (d.includes('transferencia') || d.includes('banco') || d.includes('transfer')) return 'account_balance'
                        if (d.includes('yape') || d.includes('plin') || d.includes('movil') || d.includes('qr')) return 'qr_code'
                        if (d.includes('cheque')) return 'description'
                        if (d.includes('nota') || d.includes('credito')) return 'receipt_long'
                        return 'paid'
                      }
                      return (
                        <button
                          key={mp.id}
                          onClick={() => {
                            const medio = mediosPago.find(m => m.id === mp.id)
                            const requiereNumeroOp = medio?.numero_operacion || false
                            if (isSelected) {
                              setMediosPagoSeleccionados(prev => prev.filter(m => m.medioPagoId !== mp.id))
                            } else if (mediosPagoSeleccionados.length === 0) {
                              setMediosPagoSeleccionados([{ medioPagoId: mp.id, descripcion: mp.descripcion, monto: total, numeroOperacion: '' }])
                            } else {
                              setMediosPagoSeleccionados(prev => [...prev, { medioPagoId: mp.id, descripcion: mp.descripcion, monto: 0, numeroOperacion: '' }])
                            }
                          }}
                          className={`flex flex-col items-center justify-center px-3 py-2 text-xs rounded-lg transition-colors min-w-[70px] ${isSelected
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                          <span className="material-symbols-outlined text-lg">{getMedioPagoIcon(mp.descripcion)}</span>
                          <span className="mt-0.5 text-[10px] leading-tight">{mp.descripcion}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Campos de monto para medios de pago seleccionados */}
                  {mediosPagoSeleccionados.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {mediosPagoSeleccionados.map((mp) => {
                        const medio = mediosPago.find(m => m.id === mp.medioPagoId)
                        const requiereNumeroOp = medio?.numero_operacion || false
                        return (
                          <div key={mp.medioPagoId} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[80px]">{mp.descripcion}</span>
                            {requiereNumeroOp && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">N° Oper.</span>
                                <input
                                  type="text"
                                  value={mp.numeroOperacion || ''}
                                  onChange={(e) => {
                                    setMediosPagoSeleccionados(prev =>
                                      prev.map(m => m.medioPagoId === mp.medioPagoId ? { ...m, numeroOperacion: e.target.value } : m)
                                    )
                                  }}
                                  className="w-20 px-2 py-1 text-xs text-left border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                  placeholder="Nro Oper"
                                />
                              </div>
                            )}
                            <input
                              type="number"
                              step="0.01"
                              value={mp.monto}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) || 0
                                setMediosPagoSeleccionados(prev =>
                                  prev.map(m => m.medioPagoId === mp.medioPagoId ? { ...m, monto: valor } : m)
                                )
                              }}
                              className="w-24 px-2 py-1 text-xs text-right border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              placeholder="0.00"
                              min="0"
                            />
                          </div>
                        )
                      })}
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500">Pagado</span>
                        <span className={mediosPagoSeleccionados.reduce((sum, m) => sum + m.monto, 0) >= total ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                          {formatCurrency(mediosPagoSeleccionados.reduce((sum, m) => sum + m.monto, 0), { symbol: monedaSimbolo })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => procesarVenta('procesada')} disabled={processing}
                  className="py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-1">
                  {processing ? (
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-base">payments</span>
                  )}
                  Cobrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
