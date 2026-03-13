import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const proveedorSchema = z.object({
  codigo: z.string().min(1),
  tipo: z.enum(['natural', 'empresa']),
  nombre: z.string().min(1),
  nif: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  banco_cuenta: z.string().optional(),
  banco_swift: z.string().optional(),
  banco_titular: z.string().optional(),
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
      ...(search ? { OR: [
        { nombre: { contains: search, mode: 'insensitive' as const } },
        { codigo: { contains: search, mode: 'insensitive' as const } },
        { nif: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
    }

    const [total, proveedores] = await Promise.all([
      prisma.proveedor.count({ where }),
      prisma.proveedor.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { nombre: 'asc' },
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
    const proveedor = await prisma.proveedor.create({ data: { ...data, empresa_id: empresaId, created_by: userId } })
    return NextResponse.json(proveedor, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = proveedorSchema.parse(rest)
    const proveedor = await prisma.proveedor.update({ where: { id, empresa_id: empresaId }, data: { ...data, updated_by: userId } })
    return NextResponse.json(proveedor)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 })
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
