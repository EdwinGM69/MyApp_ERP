import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await params
    const cuponId = Number(id)
    if (!cuponId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const cupon = await prisma.cupon.findFirst({ where: { id: cuponId, empresa_id: empresaId } })
    if (!cupon) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })

    const categorias = await prisma.cuponCategoria.findMany({
      where: { cupon_id: cuponId },
      select: { categoria_id: true }
    })

    return NextResponse.json({ data: categorias })
  } catch (err: any) {
    console.error('GET /api/precios/cupones/[id]/categorias', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}