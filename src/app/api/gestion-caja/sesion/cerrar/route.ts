import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const { 
      session_id, 
      monto_cierre 
    } = body

    const session = await prisma.cajaGestion.findUnique({
      where: { id: session_id }
    })

    if (!session || session.usuario_apertura_id !== userId) {
      return NextResponse.json({ error: 'Sesión no encontrada o no pertenece al usuario' }, { status: 404 })
    }

    if (session.estado === 'Cerrada') {
      return NextResponse.json({ error: 'La sesión ya está cerrada' }, { status: 400 })
    }

    const updated = await prisma.cajaGestion.update({
      where: { id: session_id },
      data: {
        estado: 'Cerrada',
        monto_cierre: monto_cierre,
        fecha_cierre: new Date(),
        usuario_cierre_id: userId
      }
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Error al cerrar sesión de caja:', err)
    return NextResponse.json({ error: 'Error al cerrar sesión de caja' }, { status: 500 })
  }
}
