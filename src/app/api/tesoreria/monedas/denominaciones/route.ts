import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const monedaId = searchParams.get('monedaId')

    if (!monedaId) return NextResponse.json({ error: 'Falta monedaId' }, { status: 400 })

    const denominations = await prisma.monedaDenominacion.findMany({
      where: {
        empresa_id: empresaId,
        moneda_id: parseInt(monedaId),
        estado: true
      },
      orderBy: { valor: 'desc' }
    })

    return NextResponse.json(denominations)
  } catch (err: any) {
    console.error('Error al obtener denominaciones:', err)
    return NextResponse.json({ error: 'Error al obtener denominaciones' }, { status: 500 })
  }
}
