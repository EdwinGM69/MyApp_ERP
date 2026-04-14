import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        last_sucursal_id: true,
        usuario_sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                descripcion: true,
                direccion: true,
                departamento: true,
                provincia: true,
                distrito: true,
                activo: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const sucursales = user.usuario_sucursales
      .filter(us => us.sucursal.activo)
      .map(us => us.sucursal)

    return NextResponse.json({
      sucursales,
      lastSucursalId: user.last_sucursal_id
    })
  } catch (err: any) {
    console.error('Error fetching user sucursales:', err)
    return NextResponse.json({ error: 'Error al obtener sucursales del usuario' }, { status: 500 })
  }
}