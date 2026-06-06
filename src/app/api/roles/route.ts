import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const roleSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
  sistema: z.boolean().optional().default(false),
  activo: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (id) {
      const role = await prisma.rol.findUnique({
        where: { id: parseInt(id) },
        include: { _count: { select: { usuarios: true, permisos: true } } }
      })
      if (!role) {
        return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ data: role })
    }

    const roles = await prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { usuarios: true, permisos: true } } }
    })
    return NextResponse.json({ data: roles })
  } catch (err) {
    console.error('[API/ROLES] Error:', err)
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const data = roleSchema.parse(body)

    const existing = await prisma.rol.findUnique({ where: { nombre: data.nombre } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 400 })
    }

    const role = await prisma.rol.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        sistema: data.sistema,
        activo: data.activo,
        created_by: userId,
      }
    })
    return NextResponse.json({ data: role }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }
    console.error('[API/ROLES] Error:', err)
    return NextResponse.json({ error: 'Error al crear rol' }, { status: 500 })
  }
}
