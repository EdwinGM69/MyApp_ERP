import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().nullable(),
  rol_id: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
  telefono: z.string().optional().nullable(),
  posicion: z.string().optional().nullable(),
  two_factor_enabled: z.boolean().optional(),
  preferencias: z.any().optional(),
  roles_adicionales: z.array(z.number().int().positive()).optional(),
  last_sucursal_id: z.number().int().positive().optional().nullable(),
  sucursales_asignadas: z.array(z.number().int().positive()).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        rol: true,
        roles_adicionales: {
          include: { rol: true }
        },
        usuario_sucursales: {
          include: { sucursal: true }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { password_hash, ...safeUsuario } = usuario

    return NextResponse.json({ data: safeUsuario })
  } catch (err) {
    console.error('Error al obtener usuario:', err)
    return NextResponse.json({ error: (err as Error).message || 'Error al obtener usuario' }, { status: 500 })
  }
}


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 })
    }

    const body = await req.json()
    const data = usuarioUpdateSchema.parse(body)

    const existingUser = await prisma.usuario.findFirst({
      where: { id, empresa_id: empresaId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.usuario.findUnique({
        where: {
          empresa_id_email: {
            empresa_id: empresaId,
            email: data.email,
          },
        },
      })
      if (emailExists) {
        return NextResponse.json({ error: 'El email ya está registrado en esta empresa' }, { status: 400 })
      }
    }

    const { roles_adicionales, sucursales_asignadas, password, ...restData } = data

    const updateData: any = {
      ...restData,
      updated_by: userId,
    }

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    if (roles_adicionales !== undefined) {
      updateData.roles_adicionales = {
        deleteMany: {},
        create: roles_adicionales.map(rId => ({ rol_id: rId }))
      }
    }

    if (sucursales_asignadas !== undefined) {
      updateData.usuario_sucursales = {
        deleteMany: {},
        create: sucursales_asignadas.map(sId => ({ sucursal_id: sId, created_by: userId }))
      }
    }

    let usuario
    try {
      usuario = await prisma.usuario.update({
        where: { id },
        data: updateData,
        include: {
          rol: true,
          roles_adicionales: {
            include: { rol: true }
          },
          usuario_sucursales: {
            include: { sucursal: true }
          }
        }
      })
    } catch (prismaError: any) {
      console.error('PRISMA UPDATE ERROR:', prismaError)
      return NextResponse.json({ error: `Error de base de datos: ${prismaError.message}` }, { status: 500 })
    }

    const { password_hash, ...safeUsuario } = usuario

    return NextResponse.json(safeUsuario)
  } catch (err) {
    console.error('Error al actualizar usuario:', err)
    if (err instanceof z.ZodError) {
      const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message || 'Error al actualizar usuario' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 })
    }

    if (id === userId) {
      return NextResponse.json({ error: 'No puedes desactivar tu propio usuario' }, { status: 400 })
    }

    const existingUser = await prisma.usuario.findFirst({
      where: { id, empresa_id: empresaId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.usuario.update({
      where: { id },
      data: { 
        activo: false,
        updated_by: userId 
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al desactivar usuario' }, { status: 500 })
  }
}
