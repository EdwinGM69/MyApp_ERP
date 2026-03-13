import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const estado = searchParams.get('estado') ?? ''

    const cajas = await prisma.caja.findMany({
      where: { empresa_id: empresaId, ...(estado ? { estado } : {}) },
      include: {
        transacciones: true,
        nominaciones: true,
      },
      orderBy: { fecha_apertura: 'desc' },
      take: 20,
    })

    return NextResponse.json({ data: cajas })
  } catch {
    return NextResponse.json({ error: 'Error al obtener cajas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { accion } = body

    if (accion === 'abrir') {
      // Check no open caja
      const existing = await prisma.caja.findFirst({ where: { empresa_id: empresaId, estado: 'Abierto' } })
      if (existing) return NextResponse.json({ error: 'Ya existe una caja abierta' }, { status: 400 })

      const caja = await prisma.caja.create({
        data: {
          id_caja: body.id_caja,
          empresa_id: empresaId,
          usuario_id: userId,
          fecha_apertura: new Date(),
          saldo_inicial: body.saldo_inicial,
          moneda: body.moneda || 'USD',
          estado: 'Abierto',
          obs_apertura: body.observaciones,
          created_by: userId,
        },
      })
      return NextResponse.json(caja, { status: 201 })
    }

    if (accion === 'cerrar') {
      const caja = await prisma.caja.update({
        where: { id: body.caja_id, empresa_id: empresaId },
        data: {
          estado: 'Cerrado',
          fecha_cierre: new Date(),
          saldo_cierre: body.saldo_cierre,
          obs_cierre: body.observaciones,
          updated_by: userId,
        },
      })
      return NextResponse.json(caja)
    }

    if (accion === 'movimiento') {
      const tx = await prisma.transaccionCaja.create({
        data: {
          caja_id: body.caja_id,
          tipo: body.tipo,
          concepto: body.concepto,
          monto: body.monto,
          referencia: body.referencia,
          created_by: userId,
        },
      })
      return NextResponse.json(tx, { status: 201 })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error en operación de caja' }, { status: 500 })
  }
}
