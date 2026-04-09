import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)

    const activeModules = await prisma.empresaModulo.findMany({
      where: {
        empresa_id: empresaId,
        activo: true
      },
      include: {
        modulo: true
      }
    })

    // Simplificar la respuesta a solo los códigos de módulos activos
    const modules = activeModules.map((em: any) => ({
      codigo: em.modulo.codigo as string,
      nombre: em.modulo.descripcion as string,
      activo: em.activo as boolean
    }))

    return NextResponse.json({ data: modules })
  } catch (err: any) {
    console.error('Error al obtener módulos de empresa:', err)
    return NextResponse.json({ error: 'Error al obtener módulos de empresa' }, { status: 500 })
  }
}
