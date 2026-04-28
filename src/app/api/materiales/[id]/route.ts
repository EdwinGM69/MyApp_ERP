import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const material = await prisma.material.findUnique({
      where: { id, empresa_id: empresaId },
      include: {
        impuesto: true,
        proveedor: {
          select: { id: true, nombre: true }
        },
        presentaciones: {
          include: {
            unidad_medida: true
          }
        },
        componentes: {
          include: {
            componente: {
              select: { id: true, codigo: true, descripcion: true }
            }
          }
        },
        sustitutos: {
          include: {
            sustituto: {
              select: { id: true, codigo: true, descripcion: true }
            }
          }
        },
        moneda_precio_compra_rel: true,
        moneda_costo_promedio_rel: true
      }
    })

    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })
    }

    // Fetch user names for audit info
    let creatorName = null
    let updaterName = null

    if (material.created_by) {
      const creator = await prisma.usuario.findUnique({
        where: { id: material.created_by },
        select: { nombre: true }
      })
      creatorName = creator?.nombre
    }

    if (material.updated_by) {
      const updater = await prisma.usuario.findUnique({
        where: { id: material.updated_by },
        select: { nombre: true }
      })
      updaterName = updater?.nombre
    }

    // Fetch optional IDs raw since Prisma client is out of sync
    let esquemaId = null
    let ubicacionDefaultId = null
    try {
      const rawData = await prisma.$queryRawUnsafe<any[]>(
        `SELECT esquema_id, ubicacion_default_id FROM "Material" WHERE id = $1`,
        id
      )
      esquemaId = rawData[0]?.esquema_id ?? null
      ubicacionDefaultId = rawData[0]?.ubicacion_default_id ?? null
    } catch (e) {
      console.error('Error fetching raw IDs:', e)
    }

    return NextResponse.json({ 
      data: { 
        ...material, 
        esquema_id: esquemaId,
        ubicacion_default_id: ubicacionDefaultId,
        creator_name: creatorName, 
        updater_name: updaterName 
      } 
    })
  } catch (err) {
    console.error('Error fetching material by ID:', err)
    return NextResponse.json({ error: 'Error al obtener el material' }, { status: 500 })
  }
}
