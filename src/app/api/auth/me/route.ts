import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSubscriptionStatus } from '@/lib/subscription'

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
        },
        last_sucursal_id: true,
        usuario_sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                descripcion: true,
                activo: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario sostiene sesión pero no existe en DB' }, { status: 404 })
    }

    // Lookup moneda_id for moneda_default abbreviation
    let moneda = null
    if (user.empresa.id && user.empresa.moneda_default) {
      moneda = await prisma.moneda.findFirst({
        where: {
          empresa_id: user.empresa.id,
          abreviatura: user.empresa.moneda_default
        }
      })
    }

    // Get active sucursales assigned to user
    const activeSucursales = user.usuario_sucursales
      .filter(us => us.sucursal.activo)
      .map(us => us.sucursal)

    // Determine current sucursal
    let currentSucursal = null
    if (activeSucursales.length > 0) {
      if (user.last_sucursal_id) {
        currentSucursal = activeSucursales.find(s => s.id === user.last_sucursal_id) || null
        if (!currentSucursal) {
          // If last_sucursal_id is not valid, use first one and update DB
          currentSucursal = activeSucursales[0]
          await prisma.usuario.update({
            where: { id: userId },
            data: { last_sucursal_id: currentSucursal.id }
          })
        }
      } else {
        // No last_sucursal_id, use first one and update DB
        currentSucursal = activeSucursales[0]
        await prisma.usuario.update({
          where: { id: userId },
          data: { last_sucursal_id: currentSucursal.id }
        })
      }
    }

    const subscriptionAlert = await getSubscriptionStatus(user.empresa.id)

    const authUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      avatar_url: user.avatar_url,
      rol: user.rol.nombre,
      empresa: user.empresa.nombre,
      empresaId: user.empresa.id,
      monedaDefault: user.empresa.moneda_default || null,
      monedaId: moneda?.id || null,
      monedaSimbolo: moneda?.simbolo || '$',
      hasSucursales: activeSucursales.length > 0,
      currentSucursal: currentSucursal,
      userSucursales: activeSucursales,
      subscriptionAlert,
    }

    return NextResponse.json({ user: authUser })
  } catch (err: any) {
    if (err.message !== 'Unauthorized') {
      console.error('[API/ME] Error checking session:', err.message)
    }
    return NextResponse.json({ user: null })
  }
}
