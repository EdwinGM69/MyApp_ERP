import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const usuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  rol_id: z.number().int().positive(),
  activo: z.boolean().default(true),
  telefono: z.string().optional(),
  posicion: z.string().optional(),
  is_superadmin: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  preferencias: z.any().optional(),
  last_sucursal_id: z.number().int().positive().optional().nullable(),
  roles_adicionales: z.array(z.number().int().positive()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search
        ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
        : {}),
    }

    const [total, usuarios] = await Promise.all([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nombre: 'asc' },
        include: {
          rol: true,
          roles_adicionales: {
            include: { rol: true }
          }
        },
      }),
    ])

    const safeUsuarios = usuarios.map((u: any) => {
      const { password_hash, ...rest } = u
      return rest
    })

    return NextResponse.json({
      data: safeUsuarios,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = usuarioSchema.parse(body)

    const existingUser = await prisma.usuario.findUnique({
      where: {
        empresa_id_email: {
          empresa_id: empresaId,
          email: data.email,
        },
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado en esta empresa' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const usuario = await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password_hash: hashedPassword,
        rol_id: data.rol_id,
        activo: data.activo,
        telefono: data.telefono,
        posicion: data.posicion,
        is_superadmin: data.is_superadmin || false,
        two_factor_enabled: data.two_factor_enabled || false,
        preferencias: data.preferencias ? data.preferencias : undefined,
        empresa_id: empresaId,
        created_by: userId,
        last_sucursal_id: data.last_sucursal_id || null,
        roles_adicionales: data.roles_adicionales && data.roles_adicionales.length > 0 ? {
          create: data.roles_adicionales.map((rolId: any) => ({
            rol_id: rolId
          }))
        } : undefined,
      },
      include: {
        rol: true,
        roles_adicionales: {
          include: { rol: true }
        }
      }
    })

    const { password_hash, ...safeUsuario } = usuario

    return NextResponse.json(safeUsuario, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errorMessage = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
