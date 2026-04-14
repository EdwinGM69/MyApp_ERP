import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSucursalSchema = z.object({
  sucursalId: z.number().int().positive()
})

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const { sucursalId } = updateSucursalSchema.parse(body)

    // Verify the sucursal is assigned to the user
    const userSucursal = await prisma.usuarioSucursal.findUnique({
      where: {
        usuario_id_sucursal_id: {
          usuario_id: userId,
          sucursal_id: sucursalId
        }
      }
    })

    if (!userSucursal) {
      return NextResponse.json({ error: 'La sucursal no está asignada al usuario' }, { status: 403 })
    }

    // Update the user's last_sucursal_id
    await prisma.usuario.update({
      where: { id: userId },
      data: { last_sucursal_id: sucursalId }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error updating user last sucursal:', err)
    return NextResponse.json({ error: 'Error al actualizar la sucursal' }, { status: 500 })
  }
}