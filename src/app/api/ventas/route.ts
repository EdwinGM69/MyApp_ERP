import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateMovNumber } from '@/lib/utils'
import { businessToday, dayRangeUtc } from '@/lib/dates'

/* Comentario de prueba */
const ventaSchema = z.object({
  numero_pedido: z.string(),
  comprobante: z.string().optional(),
  cliente_id: z.number(),
  sucursal_id: z.number(),
  clase_pedido_id: z.number(),
  moneda_id: z.number().optional().nullable(),
  fecha_venta: z.string().optional().nullable(),
  estado: z.enum(['procesada', 'cotizacion', 'anulada']),
  subtotal: z.number(),
  descuento: z.number(),
  impuesto: z.number(),
  total: z.number(),
  observaciones: z.string().optional(),
  caja_id: z.number().optional().nullable(),
  doc_identificacion_id: z.number(),
  numero_identificacion: z.string(),
  nombre: z.string(),
  nombres_completos: z.string(),
  apellidos_completos: z.string(),
  direccion: z.string(),
  ubigeo: z.string().optional(),
  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  medios_pago: z.array(z.object({
    medio_pago_id: z.number(),
    importe: z.number(),
  })).optional(),

  detalles: z.array(z.object({
    material_id: z.number(),
    almacen_id: z.number(),
    unidad_medida_id: z.number(),
    cantidad: z.number(),
    precio_unit: z.number(),
    descuento: z.number(),
    descuento_cupon: z.number().optional(),
    descuento_promocion: z.number().optional(),
    cupon_id: z.number().optional().nullable(),
    promocion_id: z.number().optional().nullable(),
    impuesto: z.number(),
    subtotal: z.number(),
    condiciones: z.array(z.object({
      condicion_id: z.number().optional().nullable(),
      esquema_id: z.number().optional().nullable(),
      valor_condicion: z.number().optional().nullable(),
      simbolo: z.string().optional().nullable(),
      descripcion_corta: z.string().optional().nullable(),
      tipo: z.string().optional().nullable(),
      importe: z.number(),
    })).optional(),
  })),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const clienteId = searchParams.get('clienteId')
    const sucursalId = searchParams.get('sucursalId')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const id = searchParams.get('id')

    if (id) {
      const venta = await prisma.venta.findUnique({
        where: { id: parseInt(id), empresa_id: empresaId },
        include: {
          cliente: { select: { id: true, nombre: true, codigo: true, tipo: true, nif: true } },
          sucursal: { select: { id: true, descripcion: true } },
          moneda: { select: { id: true, descripcion: true, simbolo: true } },
          dcto_identificacion: { select: { id: true, abreviatura: true, descripcion: true } },
          clase_pedido: {
            select: {
              id: true, descripcion: true, estado_stock_id: true,
              registro_caja: true, concepto_caja_id: true
            }
          },
          detalles: {
            include: {
              material: { select: { id: true, codigo: true, descripcion: true } },
              almacen: { select: { id: true, descripcion: true } },
              unidad_medida: { select: { id: true, abreviatura: true } },
              condiciones: {
                select: {
                  id: true, condicion_id: true, esquema_id: true, descripcion_corta: true,
                  simbolo: true, tipo: true, valor_condicion: true, importe: true
                }
              }
            }
          },
          medios_pago: {
            include: { medio_pago: { select: { id: true, descripcion: true } } }
          },
        }
      })
      if (!venta) return NextResponse.json({ data: null }, { status: 404 })
      return NextResponse.json({ data: venta })
    }

    const where: any = {
      empresa_id: empresaId,
      ...(clienteId ? { cliente_id: parseInt(clienteId) } : {}),
      ...(sucursalId ? { sucursal_id: parseInt(sucursalId) } : {}),
      ...(fechaDesde || fechaHasta ? {
        fecha_venta: {
          ...(fechaDesde ? { gte: dayRangeUtc(fechaDesde).gte } : {}),
          ...(fechaHasta ? { lt: dayRangeUtc(fechaHasta).lt } : {}),
        }
      } : {}),
      ...(search ? {
        OR: [
          { numero_pedido: { contains: search, mode: 'insensitive' as const } },
          { comprobante: { contains: search, mode: 'insensitive' as const } },
          { cliente: { nombre: { contains: search, mode: 'insensitive' as const } } },
        ]
      } : {}),
    }

    const [total, ventas] = await Promise.all([
      prisma.venta.count({ where }),
      prisma.venta.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fecha_venta: 'desc' },
        include: {
          cliente: { select: { id: true, nombre: true, codigo: true, tipo: true, nif: true } },
          sucursal: { select: { id: true, descripcion: true } },
          moneda: { select: { id: true, descripcion: true, simbolo: true } },
          dcto_identificacion: { select: { id: true, abreviatura: true, descripcion: true } },
          detalles: {
            include: {
              material: { select: { id: true, codigo: true, descripcion: true } },
              unidad_medida: { select: { id: true, abreviatura: true } },
              condiciones: {
                select: {
                  id: true, descripcion_corta: true, simbolo: true,
                  tipo: true, valor_condicion: true, importe: true
                }
              }
            }
          },
          medios_pago: {
            include: { medio_pago: { select: { id: true, descripcion: true } } }
          },
        }
      }),
    ])

    const ventasEnriquecidas = await Promise.all(ventas.map(async (v) => {
      const flujoVenta = await prisma.flujoDocumentos.findFirst({
        where: { empresa_id: empresaId, referencia_id: v.id, tipo_referencia: 'V' }
      })

      const flujosHijos = await prisma.flujoDocumentos.findMany({
        where: { empresa_id: empresaId, referencia_anterior_id: v.id, activo: true }
      })

      let flujoCaja: { id: number; created_at: Date } | null = null
      let flujoAlmacen: { id: number; numero_mov: string; created_at: Date } | null = null

      for (const f of flujosHijos) {
        if (f.tipo_referencia === 'C') {
          const tc = await prisma.transaccionCaja.findUnique({
            where: { id: f.referencia_id },
            select: { id: true, created_at: true }
          })
          if (tc) flujoCaja = tc
        }
        if (f.tipo_referencia === 'I') {
          const ma = await prisma.movimientoAlmacen.findUnique({
            where: { id: f.referencia_id },
            select: { id: true, numero_mov: true, created_at: true }
          })
          if (ma) flujoAlmacen = ma
        }
      }

      return {
        ...v,
        flujo_documentos: {
          venta: flujoVenta ? { id: flujoVenta.id, created_at: flujoVenta.created_at } : null,
          caja: flujoCaja,
          almacen: flujoAlmacen,
        }
      }
    }))

    return NextResponse.json({ data: ventasEnriquecidas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err: any) {
    console.error('Error al obtener ventas:', err)
    return NextResponse.json({
      error: 'Error al obtener ventas',
      details: err.message || err.toString(),
      stack: err.stack
    }, { status: 500 })
  }
}

async function procesarEfectosVenta(
  tx: any,
  params: {
    empresaId: number
    userId: number
    venta: any
    detalles: any[]
    medios_pago: any[]
    sucursal_id: number
    moneda_id: number | null
    clienteId: number | null
    clasePedido: any
    signoOrigen: string
    materialDataMap: Map<number, number | null>
    ventaData: any
  }
) {
  const {
    empresaId,
    userId,
    venta,
    detalles,
    medios_pago,
    sucursal_id,
    moneda_id,
    clienteId,
    clasePedido,
    signoOrigen,
    materialDataMap,
    ventaData
  } = params

  if (venta.estado === 'procesada' && clasePedido.registro_almacen && clasePedido.tipo_operacion_id) {
    const currentYear = new Date().getFullYear()
    let numeroMov: string = `MOV-${Date.now()}`

    try {
      const correlativoResult = await tx.$queryRaw<Array<{ numero_actual: number; serie: string }>>`
        UPDATE "Correlativo"
        SET numero_actual = numero_actual + 1
        WHERE empresa_id = ${empresaId}
          AND tipo_documento = 'MOVALM'
          AND serie = 'MOV'
          AND year = ${currentYear}
          AND month = 0
        RETURNING numero_actual, serie
      `

      if (correlativoResult && correlativoResult.length > 0) {
        const correlativoData = await tx.correlativo.findFirst({
          where: {
            empresa_id: empresaId,
            tipo_documento: 'MOVALM',
            serie: 'MOV',
            year: currentYear,
            month: 0
          },
          select: { ceros_relleno: true }
        })
        const cerosRelleno = correlativoData?.ceros_relleno || 8
        numeroMov = `MOV-${correlativoResult[0].numero_actual.toString().padStart(cerosRelleno, '0')}`
      }
    } catch (correlativoErr: any) {
      console.warn('[ventas] Correlativo MOVALM no encontrado, usando fallback:', correlativoErr.message)
      numeroMov = `MOV-${Date.now()}`
    }

    const movimiento = await tx.movimientoAlmacen.create({
      data: {
        empresa_id: empresaId,
        numero_mov: numeroMov,
        sucursal_id: sucursal_id,
        tipo_operacion_id: clasePedido.tipo_operacion_id,
        cliente_id: clienteId ?? undefined,
        numero_pedido: venta.numero_pedido,
        fecha: venta.fecha_venta,
        created_by: userId,
        observaciones: `Movimiento generado desde venta ${venta.numero_pedido}`
      }
    })

    await tx.flujoDocumentos.create({
      data: {
        empresa_id: empresaId,
        referencia_id: movimiento.id,
        tipo_referencia: 'I',
        referencia_anterior_id: venta.id,
        activo: true,
        created_at: new Date(),
        created_by: userId
      }
    })

    let lineaDetalle = 1
    for (const d of venta.detalles) {
      const material = await tx.material.findUnique({
        where: { id: d.material_id },
        select: { esquema_id: true }
      })

      const unidad = await tx.unidadMedida.findUnique({
        where: { id: d.unidad_medida_id },
        select: { unidad_multiplo: true }
      })
      const cantidadConvertida = Number(d.cantidad) * Number(unidad?.unidad_multiplo || 1)

      let costoUnit = 0
      if (material?.esquema_id) {
        const materialCosto = await tx.materialCosto.findFirst({
          where: {
            empresa_id: empresaId,
            material_id: d.material_id,
            esquema_id: material.esquema_id,
            ...(moneda_id ? { moneda_id: moneda_id } : {}),
            fecha_desde: { lte: new Date() },
            OR: [
              { fecha_hasta: null },
              { fecha_hasta: { gte: new Date() } }
            ]
          },
          orderBy: { fecha_desde: 'desc' }
        })
        costoUnit = materialCosto ? Number(materialCosto.costo) : 0
      }

      const movDetalle = await tx.movimientoAlmacenDetalle.create({
        data: {
          movimiento_id: movimiento.id,
          material_id: d.material_id,
          unidad_medida_id: d.unidad_medida_id,
          cantidad: d.cantidad,
          costo_unit: costoUnit,
          almacen_id: d.almacen_id,
          sucursal_id: sucursal_id,
          linea: lineaDetalle.toString(),
          esquema_id: material?.esquema_id,
          estado_stock_id: clasePedido.estado_stock_id,
          created_by: userId
        }
      })
      lineaDetalle++

      let cantidadRestante = cantidadConvertida
      const estadoStockId = clasePedido.estado_stock_id || 0
      const { gte: histDesde, lt: histHasta } = dayRangeUtc(businessToday())

      const unidadStockMaterial = materialDataMap.get(d.material_id)

      const stockWhere: any = {
        empresa_id: empresaId,
        sucursal_id: sucursal_id,
        estado_stock_id: estadoStockId,
        material_id: d.material_id,
        unidad_medida_id: unidadStockMaterial,
        ...(signoOrigen === '-' ? { cantidad: { gt: 0 } } : {})
      }

      let stocks = await tx.stockMaterial.findMany({
        where: { ...stockWhere, almacen_id: d.almacen_id },
        orderBy: { id: 'asc' }
      })
      if (stocks.length === 0) {
        stocks = await tx.stockMaterial.findMany({
          where: stockWhere,
          orderBy: { id: 'asc' }
        })
      }

      for (const stockRec of stocks) {
        if (cantidadRestante <= 0) break

        const aTomar = signoOrigen === '-' ? Math.min(Number(stockRec.cantidad), cantidadRestante) : cantidadRestante

        await tx.movimientoDetalleDistribucion.create({
          data: {
            empresa_id: empresaId,
            linea_detalle_id: movDetalle.id,
            ubicacion_id: stockRec.ubicacion_id,
            numero_lote: stockRec.numero_lote,
            cantidad: aTomar,
            created_by: userId
          }
        })

        const adjustment = signoOrigen === '+' ? aTomar : -aTomar
        await tx.stockMaterial.update({
          where: { id: stockRec.id },
          data: { cantidad: { increment: adjustment } }
        })

        const newCantidad = Number(stockRec.cantidad) + adjustment

        const existingHistorial = await tx.stockMaterialHistorial.findFirst({
          where: {
            empresa_id: empresaId,
            sucursal_id: stockRec.sucursal_id,
            almacen_id: stockRec.almacen_id,
            ubicacion_id: stockRec.ubicacion_id,
            estado_stock_id: stockRec.estado_stock_id,
            material_id: stockRec.material_id,
            numero_lote: stockRec.numero_lote,
            unidad_medida_id: stockRec.unidad_medida_id,
            updated_at: {
              gte: histDesde,
              lt: histHasta
            }
          }
        })

        if (existingHistorial) {
          await tx.stockMaterialHistorial.update({
            where: { id: existingHistorial.id },
            data: { cantidad: newCantidad }
          })
        } else {
          const lastHistorial = await tx.stockMaterialHistorial.findFirst({
            where: {
              empresa_id: empresaId,
              sucursal_id: stockRec.sucursal_id,
              almacen_id: stockRec.almacen_id,
              ubicacion_id: stockRec.ubicacion_id,
              estado_stock_id: stockRec.estado_stock_id,
              material_id: stockRec.material_id,
              numero_lote: stockRec.numero_lote,
              unidad_medida_id: stockRec.unidad_medida_id,
              updated_at: { lt: histDesde }
            },
            orderBy: { updated_at: 'desc' }
          })
          const previousCantidad = lastHistorial ? Number(lastHistorial.cantidad) : 0
          const historialCantidad = previousCantidad + adjustment
          await tx.stockMaterialHistorial.create({
            data: {
              empresa_id: empresaId,
              sucursal_id: stockRec.sucursal_id,
              almacen_id: stockRec.almacen_id,
              ubicacion_id: stockRec.ubicacion_id,
              estado_stock_id: stockRec.estado_stock_id,
              material_id: stockRec.material_id,
              numero_lote: stockRec.numero_lote,
              cantidad: historialCantidad,
              unidad_medida_id: stockRec.unidad_medida_id
            }
          })
        }

        cantidadRestante -= aTomar
      }

      if (signoOrigen === '-' && cantidadRestante > 0) {
        throw new Error(`Stock insuficiente para el material ${d.material_id} en la sucursal ${sucursal_id}`)
      }
    }
  } else if (venta.estado === 'procesada') {
    const tipoOp = await tx.tipoOperacion.findUnique({
      where: { id: clasePedido.tipo_operacion_id! },
      select: { signo_origen: true }
    })
    const signo = tipoOp?.signo_origen || '-'

    for (const d of detalles) {
      const stockWhere: any = {
        empresa_id: empresaId,
        sucursal_id: sucursal_id,
        material_id: d.material_id,
        unidad_medida_id: d.unidad_medida_id,
        ...(signo === '-' ? { cantidad: { gt: 0 } } : {})
      }
      let stocksToUpdate = await tx.stockMaterial.findMany({
        where: { ...stockWhere, almacen_id: d.almacen_id }
      })
      if (stocksToUpdate.length === 0) {
        stocksToUpdate = await tx.stockMaterial.findMany({ where: stockWhere })
      }
      for (const stock of stocksToUpdate) {
        const adjustment = signo === '+' ? Number(d.cantidad) : -Number(d.cantidad)
        await tx.stockMaterial.update({
          where: { id: stock.id },
          data: { cantidad: { increment: adjustment } }
        })
      }
    }
  }

  if (venta.estado === 'procesada' && clasePedido.registro_caja) {
    if (!moneda_id) throw new Error('Se requiere moneda_id para el registro en caja')

    const sesionCaja = await tx.cajaGestion.findFirst({
      where: {
        sucursal_id: sucursal_id,
        moneda_id: moneda_id,
        usuario_apertura_id: userId,
        estado: 'Aperturada',
        ...(ventaData.caja_id ? { caja_id: ventaData.caja_id } : {})
      }
    })

    if (!sesionCaja) throw new Error('No se encontró una sesión de caja abierta para esta sucursal, moneda y usuario.')
    if (!clasePedido.concepto_caja_id) throw new Error('La clase de pedido no tiene un concepto de caja configurado.')

    const transaccionCaja = await tx.transaccionCaja.create({
      data: {
        empresa_id: empresaId,
        sucursal_id: sucursal_id,
        sesion_caja_id: sesionCaja.id,
        caja_id: sesionCaja.caja_id,
        concepto_id: clasePedido.concepto_caja_id,
        numero_documento: venta.numero_pedido,
        fecha_documento: venta.fecha_venta,
        cliente_id: venta.cliente_id,
        motivo: 'Ingreso por venta',
        importe: venta.total,
        moneda_id: venta.moneda_id,
        estado: 'P',
        created_at: new Date(),
        created_by: userId,
        pagos: medios_pago && medios_pago.length > 0 ? {
          create: medios_pago.map((mp: any) => ({
            medio_pago_id: mp.medio_pago_id,
            importe: mp.importe
          }))
        } : undefined
      }
    })

    await tx.flujoDocumentos.create({
      data: {
        empresa_id: empresaId,
        referencia_id: transaccionCaja.id,
        tipo_referencia: 'C',
        referencia_anterior_id: venta.id,
        activo: true,
        created_at: new Date(),
        created_by: userId
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/ventas] Body:', JSON.stringify(body, null, 2))
    const {
      detalles,
      medios_pago,
      cliente_id,
      empresa_id: _empresa_id,
      sucursal_id,
      moneda_id,
      clase_pedido_id,
      documento_identificacion_id,
      ...ventaData
    } = body

    const venta = await prisma.$transaction(async (tx: any) => {
      const clasePedido = await tx.clasePedido.findUnique({
        where: { id: clase_pedido_id },
        include: { tipo_operacion: true }
      })

      if (!clasePedido) throw new Error('Clase de pedido no encontrada')

      const signoOrigen = clasePedido.tipo_operacion?.signo_origen
      if (!signoOrigen) throw new Error('Tipo de operación no tiene signo_origen definido')

      // Obtener unidad_medida_id de cada material para búsqueda de stock
      const materialIds = [...new Set(detalles.map((d: any) => d.material_id))]
      const materialDataMap = new Map()
      if (materialIds.length > 0) {
        const materiales = await tx.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, unidad_medida_id: true }
        })
        materiales.forEach((m: any) => materialDataMap.set(m.id, m.unidad_medida_id))
      }

      const documentoIdentificacion = await tx.documentoIdentificacion.findUnique({
        where: { id: documento_identificacion_id },
        select: { tipo: true }
      })

      if (!documentoIdentificacion) throw new Error('Tipo documento identificación no encontrado')

      const tipoEntidad = documentoIdentificacion.tipo
      if (!tipoEntidad) throw new Error('Tipo Entidad no definida en DOcumentoIdentificacion')

      let finalClienteId = cliente_id
      if (!finalClienteId && ventaData.numero_identificacion) {
        let existingCliente = await tx.cliente.findFirst({
          where: { nif: ventaData.numero_identificacion, empresa_id: empresaId }
        })

        if (!existingCliente) {
          const nombreFinal = ventaData.nombre ? ventaData.nombre : `${ventaData.nombres_completos || ''} ${ventaData.apellidos_completos || ''}`.trim()
          existingCliente = await tx.cliente.create({
            data: {
              empresa_id: empresaId,
              codigo: `C-${Date.now().toString().slice(-6)}`,
              tipo: tipoEntidad,
              nombre: nombreFinal,
              nombres_completos: ventaData.nombres_completos,
              apellidos_completos: ventaData.apellidos_completos,
              nif: ventaData.numero_identificacion,
              direccion: ventaData.direccion,
              ubigeo: ventaData.ubigeo,
              departamento: ventaData.departamento,
              provincia: ventaData.provincia,
              distrito: ventaData.distrito,
              created_by: userId
            }
          })
        }
        finalClienteId = existingCliente.id
      }

      // Obtener número de correlativo de forma atómica
      const currentYear = new Date().getFullYear()
      let numeroPedido = ventaData.numero_pedido

      try {
        const correlativoResult = await tx.$queryRaw<Array<{ numero_actual: number; serie: string }>>`
          UPDATE "Correlativo"
          SET numero_actual = numero_actual + 1
          WHERE empresa_id = ${empresaId}
            AND tipo_documento = 'PEDVTA'
            AND serie = 'PED'
            AND year = ${currentYear}
            AND month = 0
          RETURNING numero_actual, serie
        `

        if (correlativoResult && correlativoResult.length > 0) {
          const correlativoData = await tx.correlativo.findFirst({
            where: {
              empresa_id: empresaId,
              tipo_documento: 'PEDVTA',
              serie: 'PED',
              year: currentYear,
              month: 0
            },
            select: { ceros_relleno: true }
          })
          const cerosRelleno = correlativoData?.ceros_relleno || 8
          numeroPedido = `PED-${correlativoResult[0].numero_actual.toString().padStart(cerosRelleno, '0')}`
        }
      } catch (correlativoErr: any) {
        console.warn('[POST /api/ventas] Correlativo no encontrado o error, usando fallback:', correlativoErr.message)
        numeroPedido = `PED-${Date.now().toString().slice(-6)}`
      }

      const testVenta = {
        numero_pedido: numeroPedido,
        empresa_id: empresaId,
        sucursal_id: sucursal_id,
        clase_pedido_id: clase_pedido_id,
        doc_identificacion_id: documento_identificacion_id,
        numero_identificacion: ventaData.numero_identificacion || '',
        nombre: ventaData.nombre || '',
        nombres_completos: ventaData.nombres_completos || '',
        apellidos_completos: ventaData.apellidos_completos || '',
        direccion: ventaData.direccion || '',
        ubigeo: ventaData.ubigeo || null,
        departamento: ventaData.departamento || null,
        provincia: ventaData.provincia || null,
        distrito: ventaData.distrito || null,
        estado: ventaData.estado || 'procesada',
        fecha_venta: ventaData.fecha_venta ? new Date(ventaData.fecha_venta) : new Date(),
        motivo: ventaData.motivo || null,
        hora_venta: ventaData.hora_venta || null,
        fecha_regularizacion: ventaData.fecha_regularizacion ? new Date(ventaData.fecha_regularizacion) : null,
        referencia: ventaData.referencia || null,
        moneda_id: moneda_id,
        subtotal: Number(ventaData.subtotal) || 0,
        impuesto: Number(ventaData.impuesto) || 0,
        descuento: Number(ventaData.descuento) || 0,
        descuento_cupon: Number(ventaData.descuento_cupon) || 0,
        descuento_promocion: Number(ventaData.descuento_promocion) || 0,
        total: Number(ventaData.total) || 0,
        observaciones: ventaData.observaciones || null,
        cliente_id: finalClienteId,
        created_by: userId,
      }

      const v = await tx.venta.create({
        data: {
          ...testVenta,
          detalles: {
            create: detalles.map((d: any) => ({
              material_id: d.material_id,
              almacen_id: d.almacen_id,
              unidad_medida_id: d.unidad_medida_id,
              cantidad: d.cantidad,
              precio_unit: d.precio_unit,
              descuento: d.descuento,
              descuento_cupon: d.descuento_cupon || 0,
              descuento_promocion: d.descuento_promocion || 0,
              cupon_id: d.cupon_id || null,
              promocion_id: d.promocion_id || null,
              impuesto: d.impuesto,
              subtotal: d.subtotal,
              created_by: userId,
              condiciones: d.condiciones ? {
                create: d.condiciones.filter((c: any) => {
                  const desc = c.descripcion_corta || c.descripcion || ''
                  const tipoCodigo = c.codigo || c.tipo || ''
                  return c.condicion_id || desc === 'Promocion' || desc === 'Cupon' || desc === 'IGV' || tipoCodigo === 'Descuento' || tipoCodigo === 'Impuesto'
                }).map((c: any) => {
                  let condicionIdValue = c.condicion_id
                  if (!condicionIdValue && (c.descripcion_corta === 'Promocion' || c.descripcion_corta === 'Cupon')) {
                    return { condicion_id: null, esquema_id: c.esquema_id || 1, valor_condicion: Number(c.valor_condicion) || Number(c.valor) || 0, simbolo: c.simbolo || '%', descripcion_corta: c.descripcion_corta || c.tipo || '', tipo: c.tipo || '', importe: Number(c.importe) || 0, created_by: userId }
                  }
                  return { condicion_id: condicionIdValue, esquema_id: c.esquema_id || 1, valor_condicion: Number(c.valor_condicion) || Number(c.valor) || 0, simbolo: c.simbolo || '%', descripcion_corta: c.descripcion_corta || c.tipo || '', tipo: c.tipo || '', importe: Number(c.importe) || 0, created_by: userId }
                })
              } : undefined
            }))
          },
          medios_pago: medios_pago && medios_pago.length > 0 ? {
            create: medios_pago.map((mp: any) => ({
              medio_pago_id: mp.medio_pago_id,
              importe: mp.importe,
              numero_operacion: mp.numero_operacion || null
            }))
          } : undefined
        },
        include: {
          detalles: {
            include: {
              condiciones: true,
              material: true
            }
          },
          medios_pago: {
            include: { medio_pago: true }
          }
        }
      })

      await tx.flujoDocumentos.create({
        data: {
          empresa_id: empresaId,
          referencia_id: v.id,
          tipo_referencia: 'V',
          referencia_anterior_id: null,
          activo: true,
          created_at: new Date(),
          created_by: userId
        }
      })

      await procesarEfectosVenta(tx, {
        empresaId,
        userId,
        venta: v,
        detalles,
        medios_pago,
        sucursal_id,
        moneda_id,
        clienteId: finalClienteId,
        clasePedido,
        signoOrigen,
        materialDataMap,
        ventaData
      })

      return v
    }, { timeout: 30000 })

    return NextResponse.json(venta, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('ERROR EN VENTA:', err)
    return NextResponse.json({
      error: 'Error al registrar la venta',
      details: err.message || err.toString(),
      stack: err.stack
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    const body = await req.json()

    if (!id) return NextResponse.json({ error: 'ID de venta requerido' }, { status: 400 })

    if (body.accion === 'guardar') {
      const ventaId = parseInt(id)
      const now = new Date()

      const ventaExistente = await prisma.venta.findUnique({
        where: { id: ventaId, empresa_id: empresaId }
      })
      if (!ventaExistente) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
      if (ventaExistente.estado !== 'borrador') {
        return NextResponse.json({ error: 'Solo se pueden editar ventas en borrador' }, { status: 400 })
      }

      const {
        detalles,
        medios_pago,
        cliente_id,
        sucursal_id,
        moneda_id,
        clase_pedido_id,
        documento_identificacion_id,
        ...ventaData
      } = body

      const updated = await prisma.$transaction(async (tx: any) => {
        let finalClienteId = cliente_id
        if (!finalClienteId && ventaData.numero_identificacion) {
          let existingCliente = await tx.cliente.findFirst({
            where: { nif: ventaData.numero_identificacion, empresa_id: empresaId }
          })
          if (!existingCliente) {
            const nombreFinal = ventaData.nombre
              ? ventaData.nombre
              : `${ventaData.nombres_completos || ''} ${ventaData.apellidos_completos || ''}`.trim()
            existingCliente = await tx.cliente.create({
              data: {
                empresa_id: empresaId,
                codigo: `C-${Date.now().toString().slice(-6)}`,
                tipo: 'Cliente',
                nombre: nombreFinal,
                nombres_completos: ventaData.nombres_completos || null,
                apellidos_completos: ventaData.apellidos_completos || null,
                nif: ventaData.numero_identificacion,
                direccion: ventaData.direccion || null,
                ubigeo: ventaData.ubigeo || null,
                departamento: ventaData.departamento || null,
                provincia: ventaData.provincia || null,
                distrito: ventaData.distrito || null,
                created_by: userId
              }
            })
          }
          finalClienteId = existingCliente.id
        }

        // VentaDetalleCondicion has RESTRICT FK on detalle_id.
        // Delete first so the nested deleteMany on detalles doesn't violate it.
        await tx.ventaDetalleCondicion.deleteMany({
          where: { venta_detalle: { venta_id: ventaId } }
        })

        // 1. Delete old detalles (condiciones already deleted above)
        await tx.ventaDetalle.deleteMany({ where: { venta_id: ventaId } })
        await tx.ventaMedioPago.deleteMany({ where: { venta_id: ventaId } })

        // 2. Update venta scalar fields only (no nested writes to avoid Prisma type conflict)
        await tx.venta.update({
          where: { id: ventaId },
          data: {
            sucursal_id,
            clase_pedido_id,
            doc_identificacion_id: documento_identificacion_id,
            numero_identificacion: ventaData.numero_identificacion || '',
            nombre: ventaData.nombre || '',
            nombres_completos: ventaData.nombres_completos || '',
            apellidos_completos: ventaData.apellidos_completos || '',
            direccion: ventaData.direccion || '',
            ubigeo: ventaData.ubigeo || null,
            departamento: ventaData.departamento || null,
            provincia: ventaData.provincia || null,
            distrito: ventaData.distrito || null,
            estado: ventaData.estado || 'borrador',
            fecha_venta: ventaData.fecha_venta ? new Date(ventaData.fecha_venta) : ventaExistente.fecha_venta,
            motivo: ventaData.motivo || null,
            hora_venta: ventaData.hora_venta || null,
            fecha_regularizacion: ventaData.fecha_regularizacion
              ? new Date(ventaData.fecha_regularizacion)
              : ventaExistente.fecha_regularizacion,
            referencia: ventaData.referencia || null,
            moneda_id,
            subtotal: Number(ventaData.subtotal) || 0,
            impuesto: Number(ventaData.impuesto) || 0,
            descuento: Number(ventaData.descuento) || 0,
            descuento_cupon: Number(ventaData.descuento_cupon) || 0,
            descuento_promocion: Number(ventaData.descuento_promocion) || 0,
            total: Number(ventaData.total) || 0,
            observaciones: ventaData.observaciones || null,
            cliente_id: finalClienteId ?? ventaExistente.cliente_id,
            updated_at: now,
            updated_by: userId,
          }
        })

        // 3. Create new detalles with condiciones
        for (const d of (detalles || [])) {
          const condicionesFiltered = d.condiciones ? d.condiciones.filter((c: any) => {
            const desc = c.descripcion_corta || c.descripcion || ''
            const tipoCodigo = c.codigo || c.tipo || ''
            return c.condicion_id || desc === 'Promocion' || desc === 'Cupon' || desc === 'IGV' || tipoCodigo === 'Descuento' || tipoCodigo === 'Impuesto'
          }) : []

          const detalle = await tx.ventaDetalle.create({
            data: {
              venta_id: ventaId,
              material_id: d.material_id,
              almacen_id: d.almacen_id,
              unidad_medida_id: d.unidad_medida_id,
              cantidad: d.cantidad,
              precio_unit: d.precio_unit,
              descuento: d.descuento,
              descuento_cupon: d.descuento_cupon || 0,
              descuento_promocion: d.descuento_promocion || 0,
              cupon_id: d.cupon_id || null,
              promocion_id: d.promocion_id || null,
              impuesto: d.impuesto,
              subtotal: d.subtotal,
              created_by: userId,
            }
          })

          if (condicionesFiltered.length > 0) {
            await tx.ventaDetalleCondicion.createMany({
              data: condicionesFiltered.map((c: any) => ({
                detalle_id: detalle.id,
                condicion_id: c.condicion_id || null,
                esquema_id: c.esquema_id || 1,
                valor_condicion: Number(c.valor_condicion) || Number(c.valor) || 0,
                simbolo: c.simbolo || '%',
                descripcion_corta: c.descripcion_corta || c.tipo || '',
                tipo: c.tipo || '',
                importe: Number(c.importe) || 0,
                created_by: userId
              }))
            })
          }
        }

        // 4. Create new medios_pago
        if (medios_pago && medios_pago.length > 0) {
          await tx.ventaMedioPago.createMany({
            data: medios_pago.map((mp: any) => ({
              venta_id: ventaId,
              medio_pago_id: mp.medio_pago_id,
              importe: mp.importe,
              numero_operacion: mp.numero_operacion || null
            }))
          })
        }

        // 5. Re-fetch the result with includes
        const result = await tx.venta.findUnique({
          where: { id: ventaId },
          include: {
            detalles: { include: { condiciones: true, material: true } },
            medios_pago: { include: { medio_pago: true } }
          }
        })

        const clasePedido = await tx.clasePedido.findUnique({
          where: { id: clase_pedido_id },
          include: { tipo_operacion: true }
        })
        if (!clasePedido) throw new Error('Clase de pedido no encontrada')

        const signoOrigen = clasePedido.tipo_operacion?.signo_origen
        if (!signoOrigen) throw new Error('Tipo de operación no tiene signo_origen definido')

        const materialIds = [...new Set((detalles || []).map((d: any) => d.material_id))]
        const materialDataMap = new Map()
        if (materialIds.length > 0) {
          const materiales = await tx.material.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, unidad_medida_id: true }
          })
          materiales.forEach((m: any) => materialDataMap.set(m.id, m.unidad_medida_id))
        }

        await procesarEfectosVenta(tx, {
          empresaId,
          userId,
          venta: result,
          detalles: detalles || [],
          medios_pago: medios_pago || [],
          sucursal_id,
          moneda_id,
          clienteId: finalClienteId ?? ventaExistente.cliente_id,
          clasePedido,
          signoOrigen,
          materialDataMap,
          ventaData
        })

        return result
      })

      return NextResponse.json({ success: true, data: updated })
    }

    if (body.accion !== 'anular') return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

    const ventaId = parseInt(id)
    const now = new Date()

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId, empresa_id: empresaId },
      include: {
        clase_pedido: true,
        detalles: {
          include: {
            material: { select: { id: true, codigo: true, esquema_id: true } }
          }
        }
      }
    })

    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    if (venta.estado !== 'procesada') return NextResponse.json({ error: 'Solo se pueden anular ventas procesadas' }, { status: 400 })

    const clasePedido = venta.clase_pedido
    console.log('DEBUG - ClasePedido:', clasePedido)
    console.log('DEBUG - operacion_extorno_id:', clasePedido?.operacion_extorno_id)

    await prisma.$transaction(async (tx) => {
      await tx.venta.update({
        where: { id: ventaId },
        data: {
          estado: 'anulada',
          updated_at: now,
          updated_by: userId
        }
      })

      if (clasePedido.registro_almacen && clasePedido.operacion_extorno_id) {
        const flujosAlmacen = await tx.flujoDocumentos.findMany({
          where: {
            empresa_id: empresaId,
            tipo_referencia: 'I',
            referencia_anterior_id: ventaId,
            activo: true
          }
        })

        for (const flujo of flujosAlmacen) {
          const movimientoOriginal = await tx.movimientoAlmacen.findUnique({
            where: { id: flujo.referencia_id },
            include: {
              detalles: {
                include: {
                  material: { select: { id: true, codigo: true, esquema_id: true } }
                }
              }
            }
          })

          if (!movimientoOriginal) continue

          console.log('DEBUG - Creating extorno movimiento, operacion_extorno_id:', clasePedido.operacion_extorno_id)
          const movimientoExtorno = await tx.movimientoAlmacen.create({
            data: {
              empresa_id: empresaId,
              numero_mov: generateMovNumber(),
              documento: movimientoOriginal.documento,
              referencia: `ANULACIÓN: ${movimientoOriginal.referencia || 'Venta ' + venta.numero_pedido}`,
              tipo_operacion_id: clasePedido.operacion_extorno_id,
              cliente_id: movimientoOriginal.cliente_id,
              sucursal_id: movimientoOriginal.sucursal_id,
              numero_pedido: `ANUL-${venta.numero_pedido}`,
              fecha: now,
              created_by: userId,
              observaciones: `Extorno de movimiento ${movimientoOriginal.numero_mov} por anulación de venta ${venta.numero_pedido}`
            }
          })

          await tx.flujoDocumentos.create({
            data: {
              empresa_id: empresaId,
              referencia_id: movimientoExtorno.id,
              tipo_referencia: 'I',
              referencia_anterior_id: ventaId,
              activo: true,
              created_at: now,
              created_by: userId
            }
          })

          for (const det of movimientoOriginal.detalles) {
            const movDetalleExtorno = await tx.movimientoAlmacenDetalle.create({
              data: {
                movimiento_id: movimientoExtorno.id,
                material_id: det.material_id,
                cantidad: det.cantidad,
                unidad_medida_id: det.unidad_medida_id,
                costo_unit: det.costo_unit,
                almacen_id: det.almacen_id,
                sucursal_id: det.sucursal_id,
                linea: det.linea,
                esquema_id: det.esquema_id,
                estado_stock_id: det.estado_stock_id,
                created_by: userId
              }
            })

            const distribucionesOriginal = await tx.movimientoDetalleDistribucion.findMany({
              where: { linea_detalle_id: det.id }
            })

            for (const dist of distribucionesOriginal) {
              await tx.movimientoDetalleDistribucion.create({
                data: {
                  empresa_id: empresaId,
                  linea_detalle_id: movDetalleExtorno.id,
                  ubicacion_id: dist.ubicacion_id,
                  numero_lote: dist.numero_lote,
                  cantidad: dist.cantidad,
                  created_by: userId
                }
              })

              const stock = det.estado_stock_id ? await tx.stockMaterial.findFirst({
                where: {
                  empresa_id: empresaId,
                  sucursal_id: det.sucursal_id,
                  almacen_id: det.almacen_id,
                  ubicacion_id: dist.ubicacion_id,
                  estado_stock_id: det.estado_stock_id,
                  material_id: det.material_id,
                  numero_lote: dist.numero_lote,
                  unidad_medida_id: det.unidad_medida_id
                }
              }) : null

              if (stock) {
                await tx.stockMaterial.update({
                  where: { id: stock.id },
                  data: { cantidad: { increment: Number(dist.cantidad) } }
                })
              }

              const todayRange = dayRangeUtc(businessToday(now))
              const existingHistorial = det.estado_stock_id ? await tx.stockMaterialHistorial.findFirst({
                where: {
                  empresa_id: empresaId,
                  sucursal_id: det.sucursal_id,
                  almacen_id: det.almacen_id,
                  ubicacion_id: dist.ubicacion_id,
                  estado_stock_id: det.estado_stock_id,
                  material_id: det.material_id,
                  numero_lote: dist.numero_lote,
                  updated_at: {
                    gte: todayRange.gte,
                    lt: todayRange.lt
                  }
                }
              }) : null

              if (existingHistorial && stock) {
                const newCantidad = Number(stock.cantidad)
                await tx.stockMaterialHistorial.update({
                  where: { id: existingHistorial.id },
                  data: { cantidad: newCantidad }
                })
              }
            }
          }
        }
      }

      if (clasePedido.registro_caja && clasePedido.concepto_extorno_id) {
        const flujosCaja = await tx.flujoDocumentos.findMany({
          where: {
            empresa_id: empresaId,
            tipo_referencia: 'C',
            referencia_anterior_id: ventaId,
            activo: true
          }
        })

        for (const flujo of flujosCaja) {
          const transaccionOriginal = await tx.transaccionCaja.findUnique({
            where: { id: flujo.referencia_id },
            include: {
              pagos: true
            }
          })

          if (!transaccionOriginal) continue

          const transaccionExtorno = await tx.transaccionCaja.create({
            data: {
              empresa_id: empresaId,
              sucursal_id: transaccionOriginal.sucursal_id,
              sesion_caja_id: transaccionOriginal.sesion_caja_id,
              caja_id: transaccionOriginal.caja_id,
              concepto_id: clasePedido.concepto_extorno_id,
              numero_documento: `ANUL-${transaccionOriginal.numero_documento}`,
              fecha_documento: now,
              cliente_id: transaccionOriginal.cliente_id,
              motivo: `ANULACIÓN: ${transaccionOriginal.motivo || 'Venta ' + venta.numero_pedido}`,
              importe: Number(transaccionOriginal.importe) * -1,
              moneda_id: transaccionOriginal.moneda_id,
              estado: 'P',
              transaccion_anula_id: transaccionOriginal.id,
              created_at: now,
              created_by: userId
            }
          })

          await tx.flujoDocumentos.create({
            data: {
              empresa_id: empresaId,
              referencia_id: transaccionExtorno.id,
              tipo_referencia: 'C',
              referencia_anterior_id: ventaId,
              activo: true,
              created_at: now,
              created_by: userId
            }
          })

          for (const pago of transaccionOriginal.pagos) {
            await tx.transaccionCajaPago.create({
              data: {
                transaccion_id: transaccionExtorno.id,
                medio_pago_id: pago.medio_pago_id,
                importe: pago.importe,
                referencia_banco: pago.referencia_banco,
                numero_operacion: pago.numero_operacion
              }
            })
          }

          if (transaccionOriginal.estado === 'P') {
            await tx.transaccionCaja.update({
              where: { id: transaccionOriginal.id },
              data: { estado: 'A', motivo_anulacion: 'Anulada por extorno de venta' }
            })
          }
        }
      }

      return { success: true, ventaId }
    }, { timeout: 30000 })

    return NextResponse.json({ success: true, message: 'Venta anulada correctamente' })
  } catch (err: any) {
    console.error('ERROR EN PATCH /api/ventas:', err)
    return NextResponse.json({
      error: 'Error al procesar la solicitud de venta',
      details: err.message || err.toString()
    }, { status: 500 })
  }
}