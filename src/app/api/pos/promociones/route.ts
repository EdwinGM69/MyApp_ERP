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

    // Allow client to pass the sale date for accurate promo validation
    const fechaParam = searchParams.get('fecha')
    const now = fechaParam ? new Date(fechaParam) : new Date()
    console.log('[POS Promociones] empresaId:', empresaId, 'materialIds:', materialIds, 'now:', now)

    const promociones = await prisma.promocion.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
        fecha_inicio: { lte: now },
        fecha_fin: { gte: now },
        canales: {
          some: { canal: 'pos' }
        }
      },
      include: {
        detalles: true,
        categorias: {
          include: {
            categoria: true
          }
        }
      }
    })

    console.log('[POS Promociones] raw result:', JSON.stringify(promociones))

    const result = promociones.map(promocion => {
      const materialIdsInPromo = promocion.detalles.map(d => d.material_id)
      const categoriaIdsInPromo = promocion.categorias.map(c => c.categoria_id)
      
      return {
        id: promocion.id,
        nombre: promocion.nombre,
        cantidad_compra: promocion.cantidad_compra,
        cantidad_regalo: promocion.cantidad_regalo,
        material_ids: materialIdsInPromo,
        categoria_ids: categoriaIdsInPromo
      }
    })

    console.log('[POS Promociones] filtered result:', JSON.stringify(result))

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('Error fetching pos promociones:', err)
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })
  }
}
