import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const proveedorSchema = z.object({
  codigo: z.string().min(1, 'El código del proveedor es requerido'),
  tipo: z.enum(['natural', 'empresa']),
  tipo_proveedor: z.string().default('Nacional'),
  nombre: z.string().min(1, 'La razón social/nombre es requerida'),
  categoria: z.string().optional(),
  tipo_nif: z.string().optional(),
  nif: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  banco: z.string().optional(),
  tipo_cuenta: z.string().optional(),
  banco_cuenta: z.string().optional(),
  banco_swift: z.string().optional(),
  banco_titular: z.string().optional(),
  banco_id: z.number().optional().nullable(),
  tipo_cuenta_id: z.number().optional().nullable(),
  industria_id: z.number().optional().nullable(),
  tipo_nif_id: z.number().optional().nullable(),
  activo: z.boolean().optional(),
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
      ...(search ? {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
          { nif: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, proveedores] = await Promise.all([
      prisma.proveedor.count({ where }),
      prisma.proveedor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nombre: 'asc' },
        include: {
          industria: { select: { descripcion: true } },
          documento_nif: { select: { descripcion: true, abreviatura: true } },
          banco_entidad: { select: { id: true, descripcion: true, codigo: true } },
          tipo_cuenta_rel: { select: { id: true, descripcion: true } },
        }
      }),
    ])

    return NextResponse.json({ data: proveedores, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = proveedorSchema.parse(body)

    // Validar que no exista un proveedor con el mismo codigo o nombre
    if (data.codigo || data.nombre || data.nif) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.nombre) orConditions.push({ nombre: { equals: data.nombre, mode: 'insensitive' as const } })
      if (data.nif) orConditions.push({ nif: { equals: data.nif, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.proveedor.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un proveedor con este codigo.' }, { status: 400 })
          } else if (data.nombre && existente.nombre?.toLowerCase() === data.nombre.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un proveedor con esta descripcion.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un proveedor con este NIF.' }, { status: 400 })
        }
      }
    }

    const proveedor = await prisma.proveedor.create({ data: { ...data, empresa_id: empresaId, created_by: userId } })
    return NextResponse.json(proveedor, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/proveedores] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código del proveedor ya existe.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear proveedor: ' + (err.message || 'Error desconocido') }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = proveedorSchema.parse(rest)

    // Validar que no exista un proveedor con el mismo codigo o nombre
    if (data.codigo || data.nombre || data.nif) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.nombre) orConditions.push({ nombre: { equals: data.nombre, mode: 'insensitive' as const } })
      if (data.nif) orConditions.push({ nif: { equals: data.nif, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.proveedor.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un proveedor con este codigo.' }, { status: 400 })
          } else if (data.nombre && existente.nombre?.toLowerCase() === data.nombre.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un proveedor con esta descripcion.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un proveedor con este NIF.' }, { status: 400 })
        }
      }
    }

    const proveedor = await prisma.proveedor.update({ where: { id, empresa_id: empresaId }, data: { ...data, updated_by: userId } })
    return NextResponse.json(proveedor)
  } catch (err: any) {
    console.error('[PUT /api/proveedores] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código del proveedor ya existe.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar proveedor: ' + (err.message || 'Error desconocido') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.proveedor.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
  }
}
