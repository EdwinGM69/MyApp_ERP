import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { empresaId } = await requireAuth(req)
    const materials = await prisma.esquemaMaterial.findMany({
      where: { esquema_id: Number(id), empresa_id: empresaId },
      include: {
        material: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            categoria_rel: { select: { descripcion: true } },
            costo_promedio: true,
            activo: true,
          }
        }
      }
    })
    return NextResponse.json({ data: materials })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener materiales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { materialId, unassign } = body

    if (unassign) {
      await prisma.esquemaMaterial.delete({
        where: {
          esquema_id_material_id: {
            esquema_id: Number(id),
            material_id: Number(materialId),
          }
        }
      })
      return NextResponse.json({ ok: true })
    }

    const linked = await prisma.esquemaMaterial.upsert({
      where: {
        esquema_id_material_id: {
          esquema_id: Number(id),
          material_id: Number(materialId),
        }
      },
      update: { activo: 1 },
      create: {
        esquema_id: Number(id),
        material_id: Number(materialId),
        empresa_id: empresaId,
        created_by: userId,
        activo: 1,
      }
    })
    return NextResponse.json(linked)
  } catch (err) {
    return NextResponse.json({ error: 'Error al gestionar material' }, { status: 500 })
  }
}
