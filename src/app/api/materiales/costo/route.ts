import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/materiales/costo?materialId=<id>
 * Returns the active cost for a material based on:
 * - empresa_id (from auth)
 * - material_id (query param)
 * - moneda_id (derived from Empresa.moneda_default code → Moneda.id)
 * - esquema_id (from Material.esquema_id)
 * - fecha_hasta IS NULL (active cost)
 */
export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const materialId = searchParams.get('materialId')

    if (!materialId) {
      return NextResponse.json({ costo: 0 })
    }

    // Get empresa moneda_default code and material esquema_id in parallel
    const [empresa, material] = await Promise.all([
      prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { moneda_default: true },
      }),
      prisma.material.findUnique({
        where: { id: Number(materialId), empresa_id: empresaId },
        select: { esquema_id: true },
      }),
    ])

    if (!empresa || !material?.esquema_id) {
      return NextResponse.json({ costo: 0 })
    }

    // Resolve moneda_id from moneda abreviatura (e.g. "USD", "PEN")
    const moneda = await prisma.moneda.findFirst({
      where: {
        empresa_id: empresaId,
        abreviatura: empresa.moneda_default,
      },
      select: { id: true },
    })

    if (!moneda) {
      return NextResponse.json({ costo: 0 })
    }

    // Find active cost (fecha_hasta IS NULL)
    const costo = await prisma.materialCosto.findFirst({
      where: {
        empresa_id: empresaId,
        material_id: Number(materialId),
        moneda_id: moneda.id,
        esquema_id: material.esquema_id,
        fecha_hasta: null,
      },
      select: { costo: true },
      orderBy: { fecha_desde: 'desc' },
    })

    return NextResponse.json({ costo: costo ? Number(costo.costo) : 0 })
  } catch (err) {
    console.error('[GET /api/materiales/costo] Error:', err)
    return NextResponse.json({ costo: 0 })
  }
}
