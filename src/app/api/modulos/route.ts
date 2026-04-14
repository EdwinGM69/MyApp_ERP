import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const modulos = await prisma.modulo.findMany({
      where: { activo: true },
      orderBy: { descripcion: 'asc' }
    })

    return NextResponse.json({ data: modulos })
  } catch (err) {
    console.error('[GET /api/modulos] Error:', err)
    return NextResponse.json({ error: 'Error al obtener módulos' }, { status: 500 })
  }
}