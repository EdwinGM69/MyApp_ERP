import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const {
      sucursal_id,
      caja_id,
      moneda_id,
      monto_apertura,
      denominaciones // Array of { denominacion_id, cantidad, subtotal }
    } = body

    // 1. Check if user already has an active session
    const active = await prisma.cajaGestion.findFirst({
      where: { usuario_apertura_id: userId, estado: 'Aperturada' }
    })
    if (active) return NextResponse.json({ error: 'Ya tienes una sesión activa' }, { status: 400 })

    // 2. Create session and optional denominations in a transaction
    const session = await prisma.$transaction(async (tx) => {
      const s = await tx.cajaGestion.create({
        data: {
          sucursal_id,
          caja_id,
          moneda_id,
          monto_apertura,
          usuario_apertura_id: userId,
          fecha_apertura: new Date(),
          estado: 'Aperturada',
          denominaciones: denominaciones && denominaciones.length > 0 ? {
            create: denominaciones.map((d: any) => ({
              denominacion_id: d.denominacion_id,
              cantidad: d.cantidad,
              subtotal: d.subtotal
            }))
          } : undefined
        },
        include: {
          denominaciones: true,
          caja: true,
          sucursal: true,
          moneda: true
        }
      })
      return s
    })

    return NextResponse.json(session, { status: 201 })
  } catch (err: any) {
    console.error('Error al abrir sesión de caja:', err)
    return NextResponse.json({ error: 'Error al abrir sesión de caja', details: err.message }, { status: 500 })
  }
}
