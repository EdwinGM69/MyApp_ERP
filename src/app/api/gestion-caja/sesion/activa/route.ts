import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const monedaId = searchParams.get('monedaId')
    const sucursalId = searchParams.get('sucursalId')

    const session = await prisma.cajaGestion.findFirst({
      where: {
        usuario_apertura_id: userId,
        estado: 'Aperturada',
        ...(sucursalId ? { sucursal_id: parseInt(sucursalId) } : {}),
        ...(monedaId ? { moneda_id: parseInt(monedaId) } : {})
      },
      include: {
        caja: true,
        sucursal: true,
        moneda: true,
        usuario_apertura: {
          select: { id: true, nombre: true }
        }
      }
    })

    return NextResponse.json(session)
  } catch (err: any) {
    console.error('Error al obtener sesión activa:', err)
    return NextResponse.json({ error: 'Error al obtener sesión activa' }, { status: 500 })
  }
}
