import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const roleUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional().nullable(),
  sistema: z.boolean().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const role = await prisma.rol.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true, permisos: true } } }
    })
    if (!role) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ data: role })
  } catch (err) {
    console.error('[API/ROLES] Error:', err)
    return NextResponse.json({ error: 'Error al obtener rol' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const body = await req.json()
    const data = roleUpdateSchema.parse(body)

    if (data.nombre) {
      const existing = await prisma.rol.findUnique({ where: { nombre: data.nombre } })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Ya existe otro rol con ese nombre' }, { status: 400 })
      }
    }

    const role = await prisma.rol.update({
      where: { id },
      data: { ...data, update_by: userId }
    })
    return NextResponse.json({ data: role })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }
    console.error('[API/ROLES] Error:', err)
    return NextResponse.json({ error: 'Error al actualizar rol' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    await prisma.rol.update({
      where: { id },
      data: { activo: false, update_by: userId }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API/ROLES] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar rol' }, { status: 500 })
  }
}
