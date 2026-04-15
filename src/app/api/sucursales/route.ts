import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const sucursales = await prisma.sucursal.findMany({
      where: { empresa_id: empresaId, activo: true },
      select: {
        id: true,
        descripcion: true,
        empresa_id: true
      },
      orderBy: { descripcion: 'asc' }
    })
    return NextResponse.json({ data: sucursales })
  } catch (err) {
    console.error('[GET /api/sucursales] Error:', err)
    return NextResponse.json({ error: 'Error al obtener sucursales' }, { status: 500 })
  }
}