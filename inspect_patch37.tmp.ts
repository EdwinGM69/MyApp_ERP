import { prisma } from './src/lib/prisma'

async function main() {
  const ventaId = 37
  const empresaId = 1
  const userId = 2
  const now = new Date()

  const cuerpo = {
    numero_pedido: `PED-${Date.now().toString().slice(-6)}`,
    comprobante: 'TICKET',
    fecha_venta: new Date().toISOString(),
    cliente_id: null,
    documento_identificacion_id: 1,
    numero_identificacion: '',
    nombre: 'Consumidor Final',
    sucursal_id: 1,
    clase_pedido_id: 2,
    moneda_id: 1,
    estado: 'procesada',
    motivo: 'Venta no registrada en POS',
    hora_venta: '12:15',
    fecha_regularizacion: new Date().toISOString(),
    justificacion: '5ta prueba de regularización, prueba con nuevo producto agregado',
    subtotal: 155,
    descuento: 0,
    descuento_cupon: 0,
    descuento_promocion: 0,
    impuesto: 27.9,
    total: 155,
    observaciones: '5ta prueba de regularización, prueba con nuevo producto agregado',
    medios_pago: [
      { medio_pago_id: 2, importe: 100, numero_operacion: null },
      { medio_pago_id: 1, importe: 55, numero_operacion: 'OP-555' }
    ],
    detalles: [
      {
        material_id: 5,
        almacen_id: 1,
        unidad_medida_id: 1,
        cantidad: 1,
        precio_unit: 120,
        descuento: 0,
        descuento_cupon: 0,
        descuento_promocion: 0,
        impuesto: 21.6,
        subtotal: 120,
        promocion_id: null,
        condiciones: []
      },
      {
        material_id: 9,
        almacen_id: 1,
        unidad_medida_id: 1,
        cantidad: 1,
        precio_unit: 35,
        descuento: 0,
        descuento_cupon: 0,
        descuento_promocion: 0,
        impuesto: 6.3,
        subtotal: 35,
        promocion_id: null,
        condiciones: []
      }
    ]
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
  } = cuerpo as any

  const ventaExistente = await prisma.venta.findUnique({ where: { id: ventaId, empresa_id: empresaId } })
  if (!ventaExistente) { console.log('NO EXISTE'); return }
  console.log('Venta existente estado:', ventaExistente.estado)

  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      let finalClienteId = cliente_id

      await tx.ventaDetalleCondicion.deleteMany({
        where: { venta_detalle: { venta_id: ventaId } }
      })

      const result = await tx.venta.update({
        where: { id: ventaId },
        data: {
          sucursal_id,
          clase_pedido_id,
          doc_identificacion_id: documento_identificacion_id,
          numero_identificacion: ventaData.numero_identificacion || '',
          nombre: ventaData.nombre || '',
          estado: ventaData.estado || 'borrador',
          fecha_venta: ventaData.fecha_venta ? new Date(ventaData.fecha_venta) : ventaExistente.fecha_venta,
          motivo: ventaData.motivo || null,
          hora_venta: ventaData.hora_venta || null,
          fecha_regularizacion: ventaData.fecha_regularizacion ? new Date(ventaData.fecha_regularizacion) : ventaExistente.fecha_regularizacion,
          referencia: ventaData.referencia || null,
          moneda_id,
          subtotal: Number(ventaData.subtotal) || 0,
          impuesto: Number(ventaData.impuesto) || 0,
          descuento: Number(ventaData.descuento) || 0,
          descuento_cupon: Number(ventaData.descuento_cupon) || 0,
          descuento_promocion: Number(ventaData.descuento_promocion) || 0,
          total: Number(ventaData.total) || 0,
          observaciones: ventaData.observaciones || null,
          cliente_id: finalClienteId,
          updated_at: now,
          updated_by: userId,
          detalles: {
            deleteMany: {},
            create: (detalles || []).map((d: any) => ({
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
                  return {
                    condicion_id: c.condicion_id || null,
                    esquema_id: c.esquema_id || 1,
                    valor_condicion: Number(c.valor_condicion) || Number(c.valor) || 0,
                    simbolo: c.simbolo || '%',
                    descripcion_corta: c.descripcion_corta || c.tipo || '',
                    tipo: c.tipo || '',
                    importe: Number(c.importe) || 0,
                    created_by: userId
                  }
                })
              } : undefined
            }))
          },
          medios_pago: {
            deleteMany: {},
            create: (medios_pago || []).map((mp: any) => ({
              medio_pago_id: mp.medio_pago_id,
              importe: mp.importe,
              numero_operacion: mp.numero_operacion || null
            }))
          }
        },
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

      // procesarEfectosVenta simulation
      if (result.estado === 'procesada' && clasePedido.registro_almacen && clasePedido.tipo_operacion_id) {
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
              where: { empresa_id: empresaId, tipo_documento: 'MOVALM', serie: 'MOV', year: currentYear, month: 0 },
              select: { ceros_relleno: true }
            })
            const cerosRelleno = correlativoData?.ceros_relleno || 8
            numeroMov = `MOV-${correlativoResult[0].numero_actual.toString().padStart(cerosRelleno, '0')}`
          }
        } catch (correlativoErr: any) {
          console.warn('Correlativo MOVALM fallback:', correlativoErr.message)
          numeroMov = `MOV-${Date.now()}`
        }

        const movimiento = await tx.movimientoAlmacen.create({
          data: {
            empresa_id: empresaId,
            numero_mov: numeroMov,
            sucursal_id: sucursal_id,
            tipo_operacion_id: clasePedido.tipo_operacion_id,
            cliente_id: finalClienteId ?? undefined,
            numero_pedido: result.numero_pedido,
            fecha: result.fecha_venta,
            created_by: userId,
            observaciones: `Movimiento generado desde venta ${result.numero_pedido}`
          }
        })
        console.log('Movi cre:", ', movimiento.id, numeroMov)
      }
      return result
    }, { timeout: 30000 })

    console.log('SUCCESS')
  } catch (err: any) {
    console.error('ERR:', err.message)
    console.error(JSON.stringify(err, null, 2).slice(0, 3000))
  } finally {
    process.exit(0)
  }
}

main()