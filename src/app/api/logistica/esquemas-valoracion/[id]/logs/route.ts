import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { empresaId } = await requireAuth(req)
    const logs = await prisma.esquemaValoracionLog.findMany({
      where: { esquema_id: Number(id), empresa_id: empresaId },
      include: {
        usuario_creador: { select: { nombre: true, rol: { select: { nombre: true } } } }
      },
      orderBy: { created_at: 'desc' }
    })
    return NextResponse.json({ data: logs })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
