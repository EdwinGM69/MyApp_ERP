import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        avatar_url: true,
        rol: {
          select: { nombre: true }
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            moneda_default: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario sostiene sesión pero no existe en DB' }, { status: 404 })
    }

    // Lookup moneda_id for moneda_default abbreviation
    const moneda = await prisma.moneda.findFirst({
      where: { 
        empresa_id: user.empresa.id,
        abreviatura: user.empresa.moneda_default
      }
    })

    const authUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      avatar_url: user.avatar_url,
      rol: user.rol.nombre,
      empresa: user.empresa.nombre,
      empresaId: user.empresa.id,
      monedaDefault: user.empresa.moneda_default,
      monedaId: moneda?.id,
      monedaSimbolo: moneda?.simbolo || '$'
    }

    return NextResponse.json({ user: authUser })
  } catch (err: any) {
    if (err.message !== 'Unauthorized') {
      console.error('[API/ME] Error checking session:', err.message)
    }
    return NextResponse.json({ user: null })
  }
}
