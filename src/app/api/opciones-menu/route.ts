import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)

    const opciones = await prisma.opcionMenu.findMany({
      where: { activo: true },
      orderBy: [{ modulo_id: 'asc' }, { orden: 'asc' }],
      include: {
        modulo: {
          select: { id: true, codigo: true, descripcion: true, icono: true }
        }
      }
    })

    return NextResponse.json({ data: opciones })
  } catch (err) {
    console.error('[API/OPCIONES-MENU] Error:', err)
    return NextResponse.json({ error: 'Error al obtener opciones de menú' }, { status: 500 })
  }
}
