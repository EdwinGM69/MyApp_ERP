import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idStr } = await params
    const id = parseInt(idStr)

    const data: any[] = await prisma.$queryRaw`
      SELECT u.*, uc.nombre as creador_nombre, um.nombre as modificador_nombre
      FROM "Ubicacion" u
      LEFT JOIN "Usuario" uc ON u.created_by = uc.id
      LEFT JOIN "Usuario" um ON u.updated_by = um.id
      WHERE u.id = ${id} AND u.empresa_id = ${empresaId}
    `

    if (!data || data.length === 0) return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })

    const formattedData = {
      ...data[0],
      usuario_creador: { nombre: data[0].creador_nombre },
      usuario_modificador: { nombre: data[0].modificador_nombre }
    }

    return NextResponse.json(formattedData)
  } catch (err) {
    console.error('Error fetching single ubicacion:', err)
    return NextResponse.json({ error: 'Error al obtener la ubicación' }, { status: 500 })
  }
}
