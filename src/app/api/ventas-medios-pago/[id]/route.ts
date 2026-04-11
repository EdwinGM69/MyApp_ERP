import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const medioPagoSchema = z.object({
  medio_pago_id: z.coerce.number().optional(),
  importe: z.coerce.number().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await req.json()
    const validatedData = medioPagoSchema.parse(body)

    const medioPagoActualizado = await prisma.ventaMedioPago.update({
      where: { id },
      data: validatedData,
      include: {
        medio_pago: true
      }
    })

    return NextResponse.json(medioPagoActualizado)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 })
    }
    console.error('Error al actualizar medio de pago de venta:', err)
    return NextResponse.json({
      error: 'Error al actualizar el medio de pago',
      details: err.message || err.toString()
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const medioPago = await prisma.ventaMedioPago.findUnique({
      where: { id },
      include: {
        medio_pago: true
      }
    })

    if (!medioPago) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json(medioPago)
  } catch (err: any) {
    console.error('Error al obtener medio de pago de venta:', err)
    return NextResponse.json({ error: 'Error al obtener' }, { status: 500 })
  }
}
