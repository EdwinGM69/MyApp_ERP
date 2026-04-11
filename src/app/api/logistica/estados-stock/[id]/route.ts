import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idStr } = await params
    const id = parseInt(idStr)

    const data: any[] = await prisma.$queryRaw`
      SELECT e.*, uc.nombre as creador_nombre, um.nombre as modificador_nombre
      FROM "EstadoStock" e
      LEFT JOIN "Usuario" uc ON e.created_by = uc.id
      LEFT JOIN "Usuario" um ON e.updated_by = um.id
      WHERE e.id = ${id} AND e.empresa_id = ${empresaId}
    `

    if (!data || data.length === 0) return NextResponse.json({ error: 'Estado de stock no encontrado' }, { status: 404 })

    const formattedData = {
      ...data[0],
      usuario_creador: { nombre: data[0].creador_nombre },
      usuario_modificador: { nombre: data[0].modificador_nombre }
    }

    return NextResponse.json(formattedData)
  } catch (err) {
    console.error('Error fetching single estado de stock:', err)
    return NextResponse.json({ error: 'Error al obtener el estado de stock' }, { status: 500 })
  }
}
