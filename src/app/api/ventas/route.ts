import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateMovNumber } from '@/lib/utils'

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

    const where = {
      empresa_id: empresaId,
      ...(clienteId ? { cliente_id: parseInt(clienteId) } : {}),
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
          cliente: {
            select: { id: true, nombre: true, codigo: true, tipo: true }
          },
          sucursal: {
            select: { id: true, descripcion: true }
          },
          moneda: {
            select: { id: true, descripcion: true, simbolo: true }
          },
          dcto_identificacion: true,
          medios_pago: {
            include: { medio_pago: true }
          }
        }
      }),
    ])

    return NextResponse.json({ data: ventas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err: any) {
    console.error('Error al obtener ventas:', err)
    return NextResponse.json({
      error: 'Error al obtener ventas',
      details: err.message || err.toString(),
      stack: err.stack
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
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
      // 1. Fetch ClasePedido configuration
      const clasePedido = await tx.clasePedido.findUnique({
        where: { id: clase_pedido_id },
        include: { tipo_operacion: true }
      })

      if (!clasePedido) throw new Error('Clase de pedido no encontrada')

      const signoOrigen = clasePedido.tipo_operacion?.signo_origen
      if (!signoOrigen) throw new Error('Tipo de operación no tiene signo_origen definido')

      // 2. Manage Cliente
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
              tipo: 'natural',
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

      // 3. Create the Sale record
      const v = await tx.venta.create({
        data: {
          ...ventaData,
          empresa: { connect: { id: empresaId } },
          sucursal: { connect: { id: sucursal_id } },
          moneda: { connect: { id: moneda_id } },
          clase_pedido: { connect: { id: clase_pedido_id } },
          dcto_identificacion: { connect: { id: documento_identificacion_id } },
          cliente: { connect: { id: finalClienteId } },
          created_by: userId,
          detalles: {
            create: detalles.map((d: any) => ({
              material_id: d.material_id,
              almacen_id: d.almacen_id,
              unidad_medida_id: d.unidad_medida_id,
              cantidad: d.cantidad,
              precio_unit: d.precio_unit,
              descuento: d.descuento,
              impuesto: d.impuesto,
              subtotal: d.subtotal - d.impuesto,
              created_by: userId,
              condiciones: d.condiciones ? {
                create: d.condiciones.filter((c: any) => c.condicion_id).map((c: any) => ({
                  tipo_condicion: { connect: { id: c.condicion_id } },
                  esquema_calculo: c.esquema_id ? { connect: { id: c.esquema_id } } : undefined,
                  valor_condicion: c.valor_condicion,
                  simbolo: c.simbolo,
                  descripcion_corta: c.descripcion_corta,
                  tipo: c.tipo,
                  importe: c.importe,
                  created_by: userId,
                }))
              } : undefined
            }))
          },
          medios_pago: medios_pago && medios_pago.length > 0 ? {
            create: medios_pago.map((mp: any) => ({
              medio_pago_id: mp.medio_pago_id,
              importe: mp.importe
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

      // 1. FlujoDocumentos - Registro de Venta
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

      // 3. Generate Warehouse Movement if required
      if (ventaData.estado === 'procesada' && clasePedido.registro_almacen && clasePedido.tipo_operacion_id) {
        const movimiento = await tx.movimientoAlmacen.create({
          data: {
            empresa_id: empresaId,
            numero_mov: generateMovNumber(),
            sucursal_id: sucursal_id,
            tipo_operacion_id: clasePedido.tipo_operacion_id,
            cliente_id: finalClienteId ?? undefined,
            numero_pedido: ventaData.numero_pedido,
            fecha: new Date(ventaData.fecha_venta || new Date()),
            created_by: userId,
            observaciones: `Movimiento generado desde venta ${ventaData.numero_pedido}`
          }
        })

        // 2. FlujoDocumentos - Registro de Inventario
        await tx.flujoDocumentos.create({
          data: {
            empresa_id: empresaId,
            referencia_id: movimiento.id,
            tipo_referencia: 'I',
            referencia_anterior_id: v.id,
            activo: true,
            created_at: new Date(),
            created_by: userId
          }
        })

        let lineaDetalle = 1
        for (const d of v.detalles) {
          // A. Find Unit Cost from MaterialCosto using Material's schema
          const material = await tx.material.findUnique({
            where: { id: d.material_id },
            select: { esquema_id: true }
          })

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

          // B. Create MovimientoAlmacenDetalle
          const movDetalle = await tx.movimientoAlmacenDetalle.create({
            data: {
              movimiento_id: movimiento.id,
              material_id: d.material_id,
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

          // C. Stock Distribution
          let cantidadRestante = Number(d.cantidad)
          const estadoStockId = clasePedido.estado_stock_id || 0
          const today = new Date().toISOString().split('T')[0]

          const stocks = await tx.stockMaterial.findMany({
            where: {
              empresa_id: empresaId,
              sucursal_id: sucursal_id,
              almacen_id: d.almacen_id,
              estado_stock_id: estadoStockId,
              material_id: d.material_id,
              unidad_medida_id: d.unidad_medida_id,
              ...(signoOrigen === '-' ? { cantidad: { gt: 0 } } : {})
            },
            orderBy: { id: 'asc' } // Use ID as proxy for creation order
          })

          for (const stockRec of stocks) {
            if (cantidadRestante <= 0) break

            const aTomar = signoOrigen === '-' ? Math.min(Number(stockRec.cantidad), cantidadRestante) : cantidadRestante

            // Create distribution record
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

            // Update individual stock record
            const adjustment = signoOrigen === '+' ? aTomar : -aTomar
            await tx.stockMaterial.update({
              where: { id: stockRec.id },
              data: { cantidad: { increment: adjustment } }
            })

            const newCantidad = Number(stockRec.cantidad) + adjustment

            // Handle StockMaterialHistorial
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
                  gte: new Date(today + 'T00:00:00.000Z'),
                  lt: new Date(today + 'T23:59:59.999Z')
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
                  updated_at: { lt: new Date(today + 'T00:00:00.000Z') }
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
        }
      } else if (ventaData.estado === 'procesada') {
        // When registro_almacen is false, get signo from tipo_operacion
        const tipoOp = await tx.tipoOperacion.findUnique({
          where: { id: clasePedido.tipo_operacion_id! },
          select: { signo_origen: true }
        })
        const signo = tipoOp?.signo_origen || '-'

        for (const d of detalles) {
          const stocksToUpdate = await tx.stockMaterial.findMany({
            where: {
              empresa_id: empresaId,
              sucursal_id: sucursal_id,
              almacen_id: d.almacen_id,
              material_id: d.material_id,
              unidad_medida_id: d.unidad_medida_id,
              ...(signo === '-' ? { cantidad: { gt: 0 } } : {})
            }
          })
          for (const stock of stocksToUpdate) {
            const adjustment = signo === '+' ? Number(d.cantidad) : -Number(d.cantidad)
            await tx.stockMaterial.update({
              where: { id: stock.id },
              data: { cantidad: { increment: adjustment } }
            })
          }
        }
      }

      // 4. Register Cash Transaction if required
      if (v.estado === 'procesada' && clasePedido.registro_caja) {
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
            numero_documento: v.numero_pedido,
            fecha_documento: v.fecha_venta,
            cliente_id: v.cliente_id,
            motivo: 'Ingreso por venta',
            importe: v.total,
            moneda_id: v.moneda_id,
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

        // 3. FlujoDocumentos - Registro de Caja
        await tx.flujoDocumentos.create({
          data: {
            empresa_id: empresaId,
            referencia_id: transaccionCaja.id,
            tipo_referencia: 'C',
            referencia_anterior_id: v.id,
            activo: true,
            created_at: new Date(),
            created_by: userId
          }
        })
      }

      return v
    }, { timeout: 30000 }) // 30 segundos

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
