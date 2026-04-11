import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await prisma.usuario.findFirst({
      where: { email: 'admin@empresademo.com' },
      include: { empresa: true }
    })

    const materials = await prisma.material.findMany({
      where: { descripcion: { contains: 'teclado', mode: 'insensitive' } },
      take: 5
    })

    const tipos = await prisma.tipoOperacion.findMany({
      where: { empresa_id: user?.empresa_id },
      select: { id: true, codigo: true, descripcion: true, actualiza_costo: true }
    })

    const esquemas = await prisma.esquemaValoracion.findMany({
      where: { empresa_id: user?.empresa_id }
    })

    return NextResponse.json({
      user,
      materials,
      tipos,
      esquemas
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
