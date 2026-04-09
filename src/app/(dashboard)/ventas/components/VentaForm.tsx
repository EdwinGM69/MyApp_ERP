'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Calculator, ShoppingCart, Trash2, CheckCircle2, ArrowLeft, BarChart2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import MaterialSelect from '@/components/ui/MaterialSelect'
import ClienteSelect from '@/components/ui/ClienteSelect'
import SucursalSelect from '@/components/ui/SucursalSelect'
import ClasePedidoSelect from '@/components/ui/ClasePedidoSelect'
import AlmacenSelect from '@/components/ui/AlmacenSelect'
import UnidadSelect from '@/components/ui/UnidadSelect'
import MonedaSelect from '@/components/ui/MonedaSelect'
import Topbar from '@/components/layout/Topbar'
import { getAuthStore } from '@/hooks/useAuth'
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
  um: string
  cantidad: number
  precio_unit: number
  descuento: number
  impuesto: number
  subtotal: number
  stock: number | null
  pasos_calculados?: VentaDetalleCondicion[]
}

export default function VentaForm() {
  const router = useRouter()
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
  }, [])

  const [cliente, setCliente] = useState<{ id: number; nombre: string } | null>(null)
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
                  calculateLineCalculations(idx, l.material_id, l.cantidad, sortedPasos, esJson.data.variables || [])
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

  // Totals calculation (Keep for UI display)
  const totals = useMemo(() => {
    const total = lineas.reduce((acc, l) => acc + (l.subtotal || 0), 0)
    const subtotal = lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unit), 0)
    const descuento = lineas.reduce((acc, l) => acc + (l.descuento || 0), 0)
    const impuesto = lineas.reduce((acc, l) => acc + (l.impuesto || 0), 0)
    return { subtotal, descuento, impuesto, total }
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
      um: 'UND',
      cantidad: 1,
      precio_unit: 0,
      descuento: 0,
      impuesto: 0,
      subtotal: 0,
      stock: null
    }
    setLineas([...lineas, newLinea])
    // NOTE: New lines start collapsed (breakdown shown only on demand)
  }

  const removeLinea = (index: number) => {
    const lineId = lineas[index].id
    setLineas(lineas.filter((_, i) => i !== index))
    setExpandedLines(prev => {
      const next = new Set(prev)
      next.delete(lineId)
      return next
    })
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
    overridePasos?: EsquemaCalculoPaso[],
    overrideVariables?: any[]
  ) => {
    const activePasos = overridePasos || pasosEsquema
    const activeVariables = overrideVariables || variablesEsquema

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
      if (todasCondiciones.length === 0) {
        console.warn('DEBUG: No active conditions found for material', materialId, 'and date', dateForFiltering)
      }

      let precioUnitBase = 0 // Initialize to 0 as first step is expected to set it
      let subtotalBruto = 0
      let totalImpuesto = 0

      const results: Record<string, number> = {}
      const varContext: Record<string, number> = {}

      activeVariables.forEach(v => {
        if (v.variable_id) {
          const val = typeof v.valor === 'number' ? v.valor : parseFloat(v.valor || '0')
          varContext[v.variable_id.toLowerCase().trim()] = isNaN(val) ? 0 : val
        }
      })
      console.log('DEBUG: Variable context:', varContext)

      // Calculate each step in sequence
      const pasosCalculados: VentaDetalleCondicion[] = activePasos.map(paso => {
        let valorBase = 0
        let esporcentaje = false

        // 1. Get value from model "Condiciones" if step has a condicion_id
        console.log(`DEBUG: Processing step "${paso.descripcion_corta}" (Type: ${paso.tipo}, CondID: ${paso.condicion_id}, Formula: ${paso.formula})`)

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
            valorBase = parseFloat(condicion.valor) || 0
            esporcentaje = condicion.porcentaje === true
            console.log(`DEBUG: Step "${paso.descripcion_corta}" found match. ID: ${condicion.id}, Value: ${valorBase}, %: ${esporcentaje}`)
          } else {
            console.warn(`DEBUG: Step "${paso.descripcion_corta}" (CondId: ${paso.condicion_id}) NO found in ${todasCondiciones.length} active conditions.`)
            console.log('DEBUG: Active Cond IDs available:', todasCondiciones.map(c => c.tipo_condicion_id))

            // FALLBACK: Si es un paso de tipo Impuesto y no se encontró condición, usar 18% por defecto
            if (paso.tipo === 'Impuesto') {
              console.log('DEBUG: Applying IGV fallback (18%)')
              valorBase = 18
              esporcentaje = true
            }
          }
        } else {
          // Si no tiene condicion_id pero es de tipo Impuesto, aplicar IGV por defecto
          if (paso.tipo === 'Impuesto') {
            console.log('DEBUG: Step "Impuesto" without condicion_id - applying default 18%')
            valorBase = 18
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
          const evalContext: Record<string, number> = {
            ...varContext,
            cantidad: cantidad,
            precio_unit: precioUnitBase,
            subtotal: baseCalculo,
            valor_condicion: valorBase,
            precio: valorBase, // Alias for condition value useful in initial steps
            [stepSlug]: valorBase // Dynamically map step name to its condition value (e.g. 'descuento': 0 if not found)
          }

          // 2.2 Replace step references (s1, s2, etc.)
          formula = formula.replace(/\bs([0-9]+)\b/g, (match, num) => {
            return (results[num] || 0).toString()
          })

          // 2.3 Replace all variables from context using word boundaries to prevent logic errors
          // We sort keys by length descending to prevent replacing "subtotal" inside "super_subtotal" if applicable
          Object.keys(evalContext)
            .sort((a, b) => b.length - a.length)
            .forEach(vName => {
              const regex = new RegExp(`\\b${vName}\\b`, 'g')
              formula = formula.replace(regex, evalContext[vName].toString())
            })

          if (formula === '1' || formula === '') {
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

        // Store result for future steps
        results[paso.secuencia_paso.toString()] = valorFinal

        // Update running totals for context
        if (paso.tipo === 'Precio') {
          const formulaString = (paso.formula || '').toLowerCase()
          const isMultipliedByQty = formulaString.includes('cantidad')

          if (isMultipliedByQty && cantidad > 0) {
            precioUnitBase = valorFinal / cantidad
            subtotalBruto = valorFinal
          } else {
            precioUnitBase = valorFinal
            subtotalBruto = cantidad * precioUnitBase
          }
          console.log(`DEBUG: Updated Price Base: ${precioUnitBase}, Subtotal: ${subtotalBruto}`)
        } else if (paso.tipo === 'Impuesto') {
          totalImpuesto += valorFinal
          console.log(`DEBUG: Updated Total Tax: ${totalImpuesto}`)
        } else if (paso.tipo === 'Subtotal') {
          subtotalBruto = valorFinal // Running total for next steps
          console.log(`DEBUG: Updated Running Subtotal: ${subtotalBruto}`)
        }

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

      console.log('DEBUG: Calculation completed. Total Tax:', totalImpuesto, 'Final Subtotal:', subtotalBruto)

      setLineas(prev => {
        const next = [...prev]
        if (next[index]) {
          const l = next[index]
          l.pasos_calculados = pasosCalculados
          l.cantidad = cantidad
          l.precio_unit = precioUnitBase
          l.impuesto = totalImpuesto
          l.subtotal = subtotalBruto + totalImpuesto - l.descuento
        }
        return next
      })
    } catch (error) {
      console.error('Error in calculateLineCalculations:', error)
    }
  }

  const handleMaterialSelect = async (index: number, material: any) => {
    const newLineas = [...lineas]
    const precio = material.precio_venta || 0
    const currentLinea = newLineas[index]
    const umId = material.unidad_medida_id || 0

    newLineas[index] = {
      ...currentLinea,
      material_id: material.id,
      material_codigo: material.codigo,
      material_descripcion: material.descripcion,
      unidad_medida_id: umId,
      um: material.unidad_medida?.abreviatura || 'UND',
      precio_unit: precio,
      stock: null // Reset stock to trigger re-fetch
    }
    setLineas(newLineas)

    // Trigger stock fetch if other fields are present
    if (sucursal?.id && currentLinea.almacen_id && umId && clasePedido?.estado_stock_id) {
      fetchStock(index, material.id, currentLinea.almacen_id, sucursal.id, umId, clasePedido.estado_stock_id)
    }

    // Trigger calculations
    calculateLineCalculations(index, material.id, currentLinea.cantidad || 1)
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

    if (sucursal?.id && currentLinea.material_id && currentLinea.unidad_medida_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, almacen.id, sucursal.id, currentLinea.unidad_medida_id, clasePedido.estado_stock_id)
    }
  }

  const handleUnidadChange = (index: number, umId: number | undefined) => {
    if (!umId) return
    const newLineas = [...lineas]
    const currentLinea = newLineas[index]

    newLineas[index] = {
      ...currentLinea,
      unidad_medida_id: umId,
      stock: null
    }
    setLineas(newLineas)

    if (sucursal?.id && currentLinea.material_id && currentLinea.almacen_id && clasePedido?.estado_stock_id) {
      fetchStock(index, currentLinea.material_id, currentLinea.almacen_id, sucursal.id, umId, clasePedido.estado_stock_id)
    }
  }

  const handleLineaChange = (index: number, field: keyof VentaDetalle, value: any) => {
    const newLineas = [...lineas]
    const l = { ...newLineas[index], [field]: value }

    // If change is quantity or price_unit, we need to recalculate
    if (field === 'cantidad' || field === 'precio_unit' || field === 'descuento') {
      if (l.material_id && pasosEsquema.length > 0) {
        // Let calculateLineCalculations handle ALL logic to avoid conflicts
        calculateLineCalculations(index, l.material_id, field === 'cantidad' ? value : l.cantidad)
      } else {
        // Manual fallback if no schema
        const subtotalBruto = l.cantidad * l.precio_unit
        l.subtotal = subtotalBruto - l.descuento + l.impuesto
        newLineas[index] = l
        setLineas(newLineas)
      }
    } else {
      newLineas[index] = l
      setLineas(newLineas)
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!cliente) return toast.error('Debe seleccionar un cliente')
    if (!sucursal) return toast.error('Debe seleccionar una sucursal')
    if (!clasePedido) return toast.error('Debe seleccionar una clase de pedido')
    if (lineas.length === 0) return toast.error('Debe agregar al menos un producto')

    const invalidLine = lineas.find(l => !l.material_id || !l.almacen_id || !l.unidad_medida_id)
    if (invalidLine) return toast.error('Debe completar material, almacén y unidad para todos los productos')

    if (clasePedido.registro_caja) {
      if (!monedaId) return toast.error('Debe seleccionar una moneda para validar la caja')
      const activeSession = await checkActiveCashSession(sucursal.id, monedaId)
      if (!activeSession) {
        return toast.error('No se encontró una caja aperturada para esta sucursal, moneda y usuario. Por favor, aperture caja antes de finalizar.')
      }
    }

    setLoading(true)
    try {
      const payload = {
        numero_pedido: `PED-${Date.now().toString().slice(-6)}`,
        comprobante,
        fecha_venta: new Date(fechaVenta).toISOString(),
        cliente_id: cliente.id,
        sucursal_id: sucursal.id,
        clase_pedido_id: clasePedido.id,
        moneda_id: monedaId,
        estado: 'procesada',
        subtotal: totals.subtotal,
        descuento: totals.descuento,
        impuesto: totals.impuesto,
        total: totals.total,
        observaciones,
        detalles: lineas.map(l => ({
          material_id: l.material_id,
          almacen_id: l.almacen_id,
          unidad_medida_id: l.unidad_medida_id,
          cantidad: l.cantidad,
          precio_unit: l.precio_unit,
          descuento: l.descuento,
          impuesto: l.impuesto,
          subtotal: l.subtotal,
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
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Info */}
        <aside className="w-[320px] h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">SUCURSAL</label>
              <SucursalSelect
                selectedLabel={sucursal?.descripcion}
                onSelect={(s) => setSucursal({ id: s.id, descripcion: s.descripcion })}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CLASE PEDIDO</label>
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">MONEDA</label>
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">CLIENTE</label>
              <ClienteSelect
                selectedLabel={cliente?.nombre}
                onSelect={(c) => setCliente({ id: c.id, nombre: c.nombre })}
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">COMPROBANTE</label>
                <input
                  type="text"
                  placeholder="F001-000001"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FECHA VENTA</label>
                <input
                  type="date"
                  value={fechaVenta}
                  onChange={(e) => setFechaVenta(e.target.value)}
                  className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">OBSERVACIONES</label>
              <textarea
                rows={3}
                placeholder="Notas adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-900 rounded-[28px] border border-slate-800 shadow-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">Total</span>
                <span className="text-3xl font-black text-white leading-none tracking-tighter">
                  {mounted ? formatCurrency(totals.total, { symbol: monedaSimbolo }) : '...'}
                </span>
              </div>
            </div>
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
              <button
                type="button"
                onClick={addLinea}
                className="h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Añadir Producto
              </button>
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
                            <div className="mt-2 flex items-center gap-1.5 ml-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                                Precio Unitario: <span className="text-blue-600 font-black tracking-tight">{mounted ? formatCurrency(linea.precio_unit, { symbol: monedaSimbolo }) : '...'}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">ALMACÉN</label>
                          <AlmacenSelect
                            selectedLabel={linea.almacen_descripcion}
                            onSelect={(a) => handleAlmacenSelect(index, a)}
                          />
                          {linea.stock !== null && (
                            <div className="mt-2 flex items-center gap-1.5 ml-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                                Stock: <span className={cn(linea.stock <= 0 ? "text-red-500" : "text-blue-600 font-black tracking-tight")}>{linea.stock}</span> {linea.um}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-3">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">UNIDAD</label>
                          <UnidadSelect
                            value={linea.unidad_medida_id}
                            onChange={(id) => handleUnidadChange(index, id)}
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CANTIDAD</label>
                          <input
                            type="number"
                            value={linea.cantidad}
                            onChange={(e) => handleLineaChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-right outline-none focus:border-blue-500 transition-all"
                          />
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

                              {/* Summary totals row removed */}
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
