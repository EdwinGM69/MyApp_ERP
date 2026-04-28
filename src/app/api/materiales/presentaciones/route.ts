import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const materialId = searchParams.get('materialId')
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined

    if (!materialId || isNaN(parseInt(materialId))) {
      return NextResponse.json({ error: 'materialId es requerido y debe ser un número' }, { status: 400 })
    }

    const where = {
      material_id: parseInt(materialId),
      activo: true
    }

    const presentaciones = await prisma.materialPresentacion.findMany({
      where,
      include: {
        unidad_medida: true
      },
      take: pageSize,
      orderBy: { id: 'asc' }
    })

    return NextResponse.json({ data: presentaciones })
  } catch (err) {
    console.error('Error fetching presentaciones:', err)
    return NextResponse.json({ error: 'Error al obtener las presentaciones' }, { status: 500 })
  }
}