import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const planes = await prisma.plan.findMany({
      where: {
        activo: true,
        precios: { some: { activo: true, precio: { gt: 0 } } },
      },
      orderBy: { orden_visual: 'asc' },
      include: {
        precios: {
          where: { activo: true, precio: { gt: 0 } },
          orderBy: { id: 'asc' },
        },
        caracteristicas: {
          where: { activo: true },
          orderBy: { id: 'asc' },
        },
      },
    })

    return NextResponse.json({ data: planes })
  } catch (err) {
    console.error('[API/PLANES] Error:', err)
    return NextResponse.json({ error: 'Error al obtener los planes' }, { status: 500 })
  }
}
