import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const proveedor = await prisma.proveedor.findUnique({
      where: { id, empresa_id: empresaId },
      include: {
        tipo_cuenta_rel: { select: { id: true, descripcion: true } },
        banco_entidad: { 
          include: { 
            tipos_cuenta: { where: { activo: true }, orderBy: { descripcion: 'asc' } }
          } 
        },
        industria: { select: { id: true, descripcion: true } },
        documento_nif: { select: { id: true, descripcion: true, abreviatura: true } },
      }
    })

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    // Fetch user names for audit info
    let creatorName = null
    let updaterName = null

    if (proveedor.created_by) {
      const creator = await prisma.usuario.findUnique({
        where: { id: proveedor.created_by },
        select: { nombre: true }
      })
      creatorName = creator?.nombre
    }

    if (proveedor.updated_by) {
      const updater = await prisma.usuario.findUnique({
        where: { id: proveedor.updated_by },
        select: { nombre: true }
      })
      updaterName = updater?.nombre
    }

    return NextResponse.json({ 
      data: { 
        ...proveedor, 
        creator_name: creatorName, 
        updater_name: updaterName 
      } 
    })
  } catch (err) {
    console.error('Error fetching provider by ID:', err)
    return NextResponse.json({ error: 'Error al obtener el proveedor' }, { status: 500 })
  }
}
