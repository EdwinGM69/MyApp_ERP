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
}

interface CartItem {
  material: Material
  cantidad: number
  precio_unit: number
  descuento: number
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
  const [promociones, setPromociones] = useState<Map<number, { cantidad_compra: number; cantidad_regalo: number }>>(new Map())
  const [descuentos, setDescuentos] = useState<Map<number, { valor: number; porcentaje: boolean; simbolo: string }>>(new Map())
  const [preciosDinamicos, setPreciosDinamicos] = useState<Map<number, number>>(new Map())

  // Esquema de cálculo
  const [pasosEsquema, setPasosEsquema] = useState<any[]>([])
  const [condiciones, setCondiciones] = useState<any[]>([])
  const [clasePedidoId, setClasePedidoId] = useState<number | null>(null)

  // Default almacen and moneda from auth/sucursal
  const [defaultAlmacenId, setDefaultAlmacenId] = useState<number>(0)
  const [defaultMonedaId, setDefaultMonedaId] = useState<number | null>(null)

  const fetchMateriales = useCallback(async () => {
    console.log('[POS] fetchMateriales called, search:', search, 'currentSucursal:', currentSucursal)
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
    console.log('[POS] Calling API with params:', params.toString())
    const res = await apiFetch(`/api/materiales?${params}`)
    const json = await res.json()
    console.log('[POS] API response:', json.data?.length, 'materials')
    setMateriales((json.data ?? []).filter((m: Material) => m.stock_actual > 0))
    setLoading(false)
  }, [search, currentSucursal])

  // Fetch materiales when mounted or when sucursal becomes available
  useEffect(() => {
    console.log('[POS] useEffect triggered, currentSucursal:', currentSucursal)
    setMounted(true)
    if (currentSucursal) {
      fetchMateriales()
    }
  }, [fetchMateriales, currentSucursal])

  // Fetch promociones when materiales are loaded
  const fetchPromociones = useCallback(async (materialIds: number[]) => {
    if (materialIds.length === 0) return
    console.log('[POS] fetchPromociones called with:', materialIds)
    try {
      const res = await apiFetch(`/api/pos/promociones?materialIds=${materialIds.join(',')}`)
      const json = await res.json()
      console.log('[POS] promociones response:', json.data)
      if (json.data) {
        const map = new Map<number, { cantidad_compra: number; cantidad_regalo: number }>()
        json.data.forEach((p: any) => {
          map.set(p.material_id, { cantidad_compra: p.cantidad_compra, cantidad_regalo: p.cantidad_regalo })
        })
        setPromociones(map)
        console.log('[POS] promociones map set, size:', map.size)
      }
    } catch (e) {
      console.error('[POS] Error fetching promociones:', e)
    }
  }, [])

  // Call fetchPromociones after materiales are loaded
  useEffect(() => {
    console.log('[POS] promociones effect - materiales.length:', materiales.length, 'currentSucursal:', currentSucursal)
    if (materiales.length > 0 && currentSucursal) {
      const ids = materiales.map(m => m.id)
      console.log('[POS] Calling fetchPromociones with:', ids)
      fetchPromociones(ids)
      fetchPreciosDinamicos(ids)
    }
  }, [materiales, currentSucursal, fetchPromociones])

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
          valorBase = parseFloat(condicion.valor) || 0
          esPorcentaje = condicion.porcentaje === true
        } else if (paso.tipo === 'Impuesto') {
          // Default IGV 18%
          valorBase = 18
          esPorcentaje = true
        }

        let valorFinal = 0

        if (valorBase > 0) {
          const baseCalculo = subtotalBruto || (cantidad * precioUnitBase)

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
    } else {
      // Default: 18% IGV if no esquema
      impuestoItem = subtotalBruto * 0.18
      pasosCalculados.push({
        condicion_id: null,
        esquema_id: null,
        valor: impuestoItem,
        codigo: 'Impuesto',
        descripcion: 'IGV',
        valor_original: 18,
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
  }, [pasosEsquema, fetchCondicionesForMaterial])

  // Load condiciones when esquema is loaded (always fetch, not just when cart has items)
  useEffect(() => {
    console.log('[POS] condiciones effect - pasosEsquema:', pasosEsquema.length)
    // Conditions are now fetched per-material when adding to cart
  }, [pasosEsquema])

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
    }

    console.log('[POS addToCart] Using esquema:', pasosEsquema.length > 0)
    if (pasosEsquema.length > 0) {
      calculated = await calculateItemWithEsquema(material, 1, precioBase)
      console.log('[POS addToCart] Calculated result:', calculated)
    } else {
      // Default calculation without esquema
      const impPct = Number(material.impuesto?.porcentaje ?? 18) / 100
      calculated = {
        precio_unit: precioBase,
        descuento: 0,
        impuesto: precioBase * impPct,
        subtotal: precioBase + (precioBase * impPct),
        pasos_calculados: [{
          condicion_id: null,
          esquema_id: null,
          valor: precioBase * impPct,
          codigo: 'Impuesto',
          descripcion: 'IGV',
          valor_original: 18,
          es_porcentaje: true
        }]
      }
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.material.id === material.id)
      if (existing) {
        const newQty = existing.cantidad + 1
        if (newQty > Number(material.stock_actual)) { toast.error('Stock insuficiente'); return prev }

        // Scale descuento and impuesto proportionally
        const itemImpuesto = existing.impuesto / existing.cantidad
        const itemDescuento = existing.descuento / existing.cantidad
        const nuevoImpuesto = itemImpuesto * newQty
        const nuevoDescuento = itemDescuento * newQty
        const nuevoSubtotal = precioBase * newQty + nuevoImpuesto - nuevoDescuento

        const newItem: CartItem = {
          ...existing,
          cantidad: newQty,
          precio_unit: precioBase,
          descuento: nuevoDescuento,
          subtotal: nuevoSubtotal,
          impuesto: nuevoImpuesto
        }

        return prev.map((i) =>
          i.material.id === material.id ? newItem : i
        )
      }
      return [...prev, {
        material,
        cantidad: 1,
        precio_unit: calculated.precio_unit,
        descuento: calculated.descuento,
        subtotal: calculated.subtotal,
        impuesto: calculated.impuesto,
        almacen_id: defaultAlmacenId,
        unidad_medida_id: material.unidad_medida_id || 1,
        pasos_calculados: calculated.pasos_calculados
      }]
    })
  }

  async function updateQty(materialId: number, qty: number) {
    if (qty <= 0) { removeFromCart(materialId); return }
    const mat = materiales.find((m) => m.id === materialId)
    if (!mat) { toast.error('Material no encontrado'); return }
    if (qty > Number(mat.stock_actual)) { toast.error('Stock insuficiente'); return }

    const item = cart.find((i) => i.material.id === materialId)
    if (!item) return

    // Scale descuento and impuesto proportionally
    const itemImpuesto = item.impuesto / item.cantidad
    const itemDescuento = item.descuento / item.cantidad
    const nuevoImpuesto = itemImpuesto * qty
    const nuevoDescuento = itemDescuento * qty
    const nuevoSubtotal = item.precio_unit * qty + nuevoImpuesto - nuevoDescuento

    setCart((prev) =>
      prev.map((i) => {
        if (i.material.id !== materialId) return i
        return {
          ...i,
          cantidad: qty,
          descuento: nuevoDescuento,
          impuesto: nuevoImpuesto,
          subtotal: nuevoSubtotal
        }
      })
    )
  }

  function removeFromCart(materialId: number) {
    setCart((prev) => prev.filter((i) => i.material.id !== materialId))
  }

  // Calcular totales - usar valores ya calculados en cada item (esquema aplicado en addToCart/updateQty)
  const calculateTotals = useCallback(() => {
    console.log('[POS totals] Using quantity x price from cart items. cart items:', cart.length)

    let subtotal = 0
    let descuentoTotal = 0

    cart.forEach(item => {
      // Solo cantidad x precio unitario (sin impuesto)
      subtotal += item.precio_unit * item.cantidad
      descuentoTotal += item.descuento

      console.log('[POS totals] Item:', item.material.codigo, 'qty:', item.cantidad, 'price:', item.precio_unit, 'lineTotal:', item.precio_unit * item.cantidad)
    })

    const impuestoTotal = cart.reduce((acc, item) => acc + item.impuesto, 0)
    const total = subtotal - descuentoTotal - descuentoCupon
    console.log('[POS totals] Final - subtotal:', subtotal, 'descuento:', descuentoTotal, 'impuesto:', impuestoTotal, 'total:', total)

    return { subtotal, descuento: descuentoTotal, impuesto: impuestoTotal, total }
  }, [cart, descuentoCupon])

  const { subtotal, descuento, impuesto, total } = calculateTotals()

  async function applyCupon() {
    if (!cupon.trim()) return
    toast.loading('Validando cupón...')
    // Mock: in production check against /api/cupones/validate
    if (cupon.toUpperCase() === 'DESC10') {
      setDescuentoCupon(subtotal * 0.10)
      toast.dismiss()
      toast.success('Cupón aplicado: 10% de descuento')
    } else {
      toast.dismiss()
      toast.error('Cupón inválido o expirado')
    }
  }

  async function procesarVenta(estado: 'procesada' | 'cotizacion') {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return }
    if (!currentSucursal) { toast.error('No hay sucursal seleccionada'); return }
    if (!defaultAlmacenId) { toast.error('No hay almacén configurado'); return }
    if (!defaultMonedaId) { toast.error('No hay moneda configurada'); return }
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
        descuento: descuento + descuentoCupon,
        total,
        detalles: cart.map((i) => ({
          material_id: i.material.id,
          cantidad: i.cantidad,
          precio_unit: i.precio_unit,
          descuento: i.descuento,
          impuesto: i.impuesto,
          subtotal: i.subtotal,
          almacen_id: i.almacen_id || defaultAlmacenId,
          unidad_medida_id: i.unidad_medida_id || 1,
          condiciones: (i.pasos_calculados || []).map(p => ({
            condicion_id: p.condicion_id,
            esquema_id: p.esquema_id,
            valor_condicion: p.valor_original,
            simbolo: p.es_porcentaje ? '%' : '$',
            descripcion_corta: p.descripcion,
            tipo: p.codigo,
            importe: p.valor
          }))
        })),
      }
      console.log('[POS procesarVenta] Payload:', JSON.stringify(payload, null, 2))
      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(estado === 'procesada' ? '¡Venta procesada exitosamente!' : 'Cotización guardada')
      setCart([])
      setCupon('')
      setDescuentoCupon(0)
      setNif('')
      setClienteNombre('')
      setClienteId(null)
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
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por código o nombre..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
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
                const promo = promociones.get(m.id)
                const desc = descuentos.get(m.id)
                const descBadge = desc ? (desc.porcentaje ? `${desc.valor}% dct` : `${formatCurrency(desc.valor, { symbol: desc.simbolo })} dct`) : ''
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
        <div className="w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
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
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">DOC. IDENTIDAD</label>
                  <DocumentoIdentificacionSelect
                    value={docIdentificacion?.id}
                    onSelect={(d) => setDocIdentificacion({ id: d.id, abreviatura: d.abreviatura })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">NÚMERO DOCUMENTO</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={numeroIdentificacion}
                      onChange={(e) => setNumeroIdentificacion(e.target.value)}
                      onBlur={handleBuscarCliente}
                      placeholder="Número de documento"
                      className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                {docIdentificacion?.abreviatura === 'RUC' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">RAZÓN SOCIAL</label>
                    <input
                      type="text"
                      value={clienteNombreFull}
                      onChange={(e) => setClienteNombreFull(e.target.value)}
                      placeholder="Nombre o razón social"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 tracking-wider">NOMBRES</label>
                      <input
                        type="text"
                        value={nombresCompletos}
                        onChange={(e) => setNombresCompletos(e.target.value)}
                        placeholder="Nombres"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 tracking-wider">APELLIDOS</label>
                      <input
                        type="text"
                        value={apellidosCompletos}
                        onChange={(e) => setApellidosCompletos(e.target.value)}
                        placeholder="Apellidos"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">DIRECCIÓN</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">UBIGEO</label>
                    <input
                      type="text"
                      value={ubigeo}
                      onChange={(e) => setUbigeo(e.target.value)}
                      placeholder="Ubigeo"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">DEPARTAMENTO</label>
                    <input
                      type="text"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      placeholder="Departamento"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">PROVINCIA</label>
                    <input
                      type="text"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      placeholder="Provincia"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">DISTRITO</label>
                    <input
                      type="text"
                      value={distrito}
                      onChange={(e) => setDistrito(e.target.value)}
                      placeholder="Distrito"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">OBSERVACIONES</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Venta POS"
                    rows={2}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-4xl block mb-2">shopping_cart</span>
                <p className="text-sm">Selecciona productos del catálogo</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.material.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.material.descripcion}
                      </p>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span>{mounted ? formatCurrency(item.precio_unit, { symbol: monedaSimbolo }) : '...'} c/u</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.material.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.material.id, item.cantidad - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.cantidad}</span>
                      <button onClick={() => updateQty(item.material.id, item.cantidad + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(item.precio_unit * item.cantidad, { symbol: monedaSimbolo })}
                    </p>
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
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider">CUPÓN</label>
                  <input value={cupon} onChange={(e) => setCupon(e.target.value.toUpperCase())}
                    placeholder="Código de cupón"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <button onClick={applyCupon}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors h-[38px]">
                  Aplicar
                </button>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, { symbol: monedaSimbolo })}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Descuento</span>
                    <span>-{formatCurrency(descuento, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
                {descuentoCupon > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento cupón</span>
                    <span>-{formatCurrency(descuentoCupon, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{mounted ? formatCurrency(total, { symbol: monedaSimbolo }) : '...'}</span>
                </div>
                {impuesto > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Impuesto</span>
                    <span>{formatCurrency(impuesto, { symbol: monedaSimbolo })}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => procesarVenta('cotizacion')} disabled={processing}
                  className="py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors disabled:opacity-60">
                  Cotización
                </button>
                <button onClick={() => procesarVenta('procesada')} disabled={processing}
                  className="py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-1">
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
