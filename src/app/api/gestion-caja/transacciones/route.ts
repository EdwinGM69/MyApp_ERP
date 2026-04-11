import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const sucursalId = searchParams.get('sucursalId')
    const cajaId = searchParams.get('cajaId')
    const sesionCajaId = searchParams.get('sesionCajaId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const skip = (page - 1) * pageSize

    const where: any = {
      empresa_id: empresaId,
      ...(sesionCajaId ? { sesion_caja_id: parseInt(sesionCajaId) } : {
        ...(sucursalId ? { sucursal_id: parseInt(sucursalId) } : {}),
        ...(cajaId ? { caja_id: parseInt(cajaId) } : {}),
        fecha_documento: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`)
        }
      })
    }

    const [transactions, total, sessionTotals] = await Promise.all([
      prisma.transaccionCaja.findMany({
        where,
        include: {
          concepto: true,
          moneda: true,
          cliente: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          pagos: {
            include: {
              medio_pago: true,
              denominaciones: {
                include: { denominacion: true }
              }
            }
          },
          usuario_creador: { select: { nombre: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.transaccionCaja.count({ where }),
      // Calculate totals for the session indicators (Ingresos/Egresos)
      prisma.transaccionCaja.aggregate({
        where,
        _sum: {
          importe: true
        }
      })
    ])

    // More granular totals for the dashboard
    const allSessionMoves = await prisma.transaccionCaja.findMany({
      where,
      select: { importe: true }
    })

    const totals = allSessionMoves.reduce((acc, t) => {
      const amount = Number(t.importe)
      if (amount > 0) acc.ingresos += amount
      else acc.egresos += Math.abs(amount)
      return acc
    }, { ingresos: 0, egresos: 0 })

    return NextResponse.json({
      data: transactions,
      total,
      totals
    })
  } catch (err: any) {
    console.error('Error al obtener transacciones:', err)
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    // Check if it is an annulation
    if (body.transaccion_anula_id) {
      return await handleAnnulation(body, empresaId, userId)
    }

    const {
      sucursal_id, caja_id, concepto_id,
      importe, moneda_id, cliente_id,
      proveedor_id, persona, motivo,
      numero_documento, fecha_documento,
      sesion_caja_id,
      pagos // Array of { medio_pago_id, importe, denominaciones: [{ denominacion_id, cantidad, subtotal }] }
    } = body

    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.transaccionCaja.create({
        data: {
          empresa_id: empresaId,
          sucursal_id,
          caja_id,
          sesion_caja_id,
          concepto_id,
          importe,
          moneda_id,
          cliente_id,
          proveedor_id,
          persona,
          motivo,
          numero_documento,
          fecha_documento: new Date(fecha_documento || new Date()),
          created_by: userId,
          estado: 'P',
          pagos: pagos && pagos.length > 0 ? {
            create: pagos.map((p: any) => ({
              medio_pago_id: p.medio_pago_id,
              importe: p.importe,
              referencia_banco: p.referencia_banco,
              denominaciones: p.denominaciones ? {
                create: p.denominaciones.map((d: any) => ({
                  denominacion_id: d.denominacion_id,
                  cantidad: d.cantidad,
                  subtotal: d.subtotal
                }))
              } : undefined
            }))
          } : undefined
        },
        include: {
          pagos: {
            include: { denominaciones: true }
          }
        }
      })
      return t
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (err: any) {
    console.error('Error al crear transacción:', err)
    return NextResponse.json({ error: 'Error al crear transacción', details: err.message }, { status: 500 })
  }
}

async function handleAnnulation(body: any, empresaId: number, userId: number) {
  const { transaccion_anula_id, motivo_anulacion } = body

  const original = await prisma.transaccionCaja.findFirst({
    where: { id: transaccion_anula_id, empresa_id: empresaId },
    include: { pagos: { include: { denominaciones: true } } }
  })

  if (!original) throw new Error('Transacción original no encontrada')
  if (original.estado === 'A') throw new Error('La transacción ya está anulada')

  const annullation = await prisma.$transaction(async (tx) => {
    // 1. Mark original as Annulled
    await tx.transaccionCaja.update({
      where: { id: original.id },
      data: { estado: 'A', motivo_anulacion }
    })

    // 2. Create Reversal Movement (Negative Import)
    const t = await tx.transaccionCaja.create({
      data: {
        empresa_id: empresaId,
        sucursal_id: original.sucursal_id,
        caja_id: original.caja_id,
        concepto_id: original.concepto_id,
        importe: Number(original.importe) * -1, // REVERSAL
        moneda_id: original.moneda_id,
        sesion_caja_id: body.sesion_caja_id || original.sesion_caja_id,
        cliente_id: original.cliente_id,
        proveedor_id: original.proveedor_id,
        persona: original.persona,
        motivo: `ANULACIÓN: ${motivo_anulacion || 'Sin motivo'}`,
        numero_documento: original.numero_documento,
        fecha_documento: new Date(),
        created_by: userId,
        estado: 'P',
        transaccion_anula_id: original.id,
        pagos: original.pagos.length > 0 ? {
          create: original.pagos.map((p: any) => ({
            medio_pago_id: p.medio_pago_id,
            importe: Number(p.importe) * -1,
            referencia_banco: p.referencia_banco,
            denominaciones: p.denominaciones.length > 0 ? {
              create: p.denominaciones.map((d: any) => ({
                denominacion_id: d.denominacion_id,
                cantidad: d.cantidad * -1,
                subtotal: Number(d.subtotal) * -1
              }))
            } : undefined
          }))
        } : undefined
      }
    })
    return t
  })

  return NextResponse.json(annullation)
}
