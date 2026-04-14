import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const materialIdsParam = searchParams.get('materialIds')

    if (!materialIdsParam) {
      return NextResponse.json({ data: [] })
    }

    const materialIds = materialIdsParam.split(',').map(Number).filter(n => !isNaN(n))
    if (materialIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const now = new Date()
    console.log('[POS Promociones] empresaId:', empresaId, 'materialIds:', materialIds, 'now:', now)

    const promociones = await prisma.promocionDetalle.findMany({
      where: {
        promocion: {
          empresa_id: empresaId,
          activo: true,
          fecha_inicio: { lte: now },
          fecha_fin: { gte: now },
        },
        material_id: { in: materialIds }
      },
      include: {
        promocion: {
          include: {
            canales: {
              where: { canal: 'pos' }
            }
          }
        }
      }
    })

    console.log('[POS Promociones] raw result:', JSON.stringify(promociones))

    const result = promociones
      .filter(p => p.promocion.canales.length > 0)
      .map(p => ({
        material_id: p.material_id,
        cantidad_compra: p.promocion.cantidad_compra,
        cantidad_regalo: p.promocion.cantidad_regalo
      }))

    console.log('[POS Promociones] filtered result:', JSON.stringify(result))

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('Error fetching pos promociones:', err)
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })
  }
}