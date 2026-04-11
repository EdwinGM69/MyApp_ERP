import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const cliente = await prisma.cliente.findUnique({
      where: { id, empresa_id: empresaId },
      include: {
        empresa: { select: { nombre: true } },
      }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Fetch user names for audit info
    let creatorName = null
    let updaterName = null

    if (cliente.created_by) {
      const creator = await prisma.usuario.findUnique({
        where: { id: cliente.created_by },
        select: { nombre: true }
      })
      creatorName = creator?.nombre
    }

    if (cliente.updated_by) {
      const updater = await prisma.usuario.findUnique({
        where: { id: cliente.updated_by },
        select: { nombre: true }
      })
      updaterName = updater?.nombre
    }

    return NextResponse.json({ 
      data: { 
        ...cliente, 
        creator_name: creatorName, 
        updater_name: updaterName 
      } 
    })
  } catch (err) {
    console.error('Error fetching client by ID:', err)
    return NextResponse.json({ error: 'Error al obtener el cliente' }, { status: 500 })
  }
}
