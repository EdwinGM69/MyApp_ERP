import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const actualizarPlanSchema = z.object({
  planId: z.coerce.number().int().positive(),
  planPrecioId: z.coerce.number().int().positive(),
  metodoPago: z.string().trim().min(1).max(80),
  referencia: z.string().trim().max(160).nullish(),
})

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)

    const body = await req.json()
    const { planId, planPrecioId, metodoPago, referencia } =
      actualizarPlanSchema.parse(body)

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        precios: { where: { activo: true }, orderBy: { id: 'asc' } },
        configuracion: true,
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'El plan seleccionado no existe' },
        { status: 400 }
      )
    }

    const precioSeleccionado = plan.precios.find((p) => p.id === planPrecioId)

    if (!precioSeleccionado) {
      return NextResponse.json(
        { error: 'El precio seleccionado no pertenece al plan o no está activo' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (precioSeleccionado.inicio_vigencia && precioSeleccionado.inicio_vigencia > now) {
      return NextResponse.json(
        { error: 'El precio seleccionado aún no se encuentra vigente' },
        { status: 400 }
      )
    }

    if (precioSeleccionado.fin_vigencia && precioSeleccionado.fin_vigencia < now) {
      return NextResponse.json(
        { error: 'El precio seleccionado ha caducado' },
        { status: 400 }
      )
    }

    const monedaId = parseInt(precioSeleccionado.moneda, 10) || 1

    const fechaInicio = new Date(now)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + plan.dias_duracion)
    const inicioGracia = new Date(fechaFin)
    inicioGracia.setDate(inicioGracia.getDate() + 1)
    const finGracia = new Date(inicioGracia)
    finGracia.setDate(finGracia.getDate() + (plan.configuracion?.dias_gracia ?? 0))

    const transaccionPago = [metodoPago, referencia].filter(Boolean).join(' — ')

    const suscripcionAnterior = await prisma.suscripcion.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { created_at: 'desc' },
    })

    const nueva = await prisma.$transaction(async (tx) => {
      if (suscripcionAnterior) {
        await tx.suscripcion.update({
          where: { id: suscripcionAnterior.id },
          data: {
            estado: 'CANCELADA',
            fecha_cancelacion: now,
            renovacion_automatica: false,
            updated_by: userId,
          },
        })
      }

      const suscripcion = await tx.suscripcion.create({
        data: {
          empresa_id: empresaId,
          plan_id: plan.id,
          plan_precio_id: precioSeleccionado.id,
          estado: 'ACTIVO',
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          inicio_gracia: inicioGracia,
          fin_gracia: finGracia,
          renovacion_automatica: true,
          created_by: userId,
          updated_by: userId,
        },
      })

      await tx.suscripcionPeriodo.create({
        data: {
          suscripcion_id: suscripcion.id,
          numero_periodo: 1,
          fecha_inicio: fechaInicio,
          activo: true,
          importe: precioSeleccionado.precio,
          moneda_id: monedaId,
          fecha_pago: now,
          transaccion_pago: transaccionPago,
          created_by: userId,
        },
      })

      await tx.suscripcionHistorial.create({
        data: {
          suscripcion_id: suscripcion.id,
          estado_anterior: suscripcionAnterior?.estado ?? '',
          estado_nuevo: 'ACTIVO',
          fecha_evento: now,
          observacion: `Cambio de plan → ${plan.descripcion}. Pago: ${metodoPago} (simulado, etapa desarrollo)`,
          created_by: userId,
        },
      })

      return suscripcion
    })

    console.log('[API/PLANES/ACTUALIZAR] Suscripción creada:', nueva.id, 'empresa:', empresaId)

    return NextResponse.json({
      data: {
        id: nueva.id,
        planId: nueva.plan_id,
        planName: plan.descripcion,
        estado: nueva.estado,
        fechaInicio: nueva.fecha_inicio.toISOString(),
        fechaFin: nueva.fecha_fin?.toISOString() ?? null,
      },
    })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Los datos enviados no son válidos' },
        { status: 400 }
      )
    }
    console.error('[API/PLANES/ACTUALIZAR] Error:', err)
    return NextResponse.json(
      { error: 'Error al actualizar el plan de suscripción' },
      { status: 500 }
    )
  }
}