import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const cambiarPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres').max(128),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)

    const body = await req.json()
    const data = cambiarPasswordSchema.parse(body)

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const validPassword = await bcrypt.compare(data.currentPassword, usuario.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    if (data.currentPassword === data.newPassword) {
      return NextResponse.json({ error: 'La nueva contraseña no puede ser igual a la actual' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(data.newPassword, 10)

    await prisma.usuario.update({
      where: { id: userId },
      data: { password_hash, updated_by: userId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error al cambiar contraseña:', err)
    if (err instanceof z.ZodError) {
      const errorMessage = err.errors.map(e => e.message).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message || 'Error al cambiar contraseña' }, { status: 500 })
  }
}