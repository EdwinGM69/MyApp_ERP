import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const medioPagoSchema = z.object({
  venta_id: z.coerce.number(),
  medio_pago_id: z.coerce.number(),
  importe: z.coerce.number(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = req.nextUrl
    const ventaId = searchParams.get('ventaId')

    const where = {
      ...(ventaId ? { venta_id: parseInt(ventaId) } : {}),
    }

    const mediosPago = await prisma.ventaMedioPago.findMany({
      where,
      include: {
        medio_pago: true,
      }
    })

    return NextResponse.json({ data: mediosPago })
  } catch (err: any) {
    console.error('Error al obtener medios de pago de venta:', err)
    return NextResponse.json({
      error: 'Error al obtener medios de pago de venta',
      details: err.message || err.toString()
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const validatedData = medioPagoSchema.parse(body)

    const nuevoMedioPago = await prisma.ventaMedioPago.create({
      data: {
        venta_id: validatedData.venta_id,
        medio_pago_id: validatedData.medio_pago_id,
        importe: validatedData.importe,
      },
      include: {
        medio_pago: true
      }
    })

    return NextResponse.json(nuevoMedioPago, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 })
    }
    console.error('Error al crear medio de pago de venta:', err)
    return NextResponse.json({
      error: 'Error al registrar el medio de pago',
      details: err.message || err.toString()
    }, { status: 500 })
  }
}
