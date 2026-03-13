import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const clienteSchema = z.object({
  codigo: z.string().min(1),
  tipo: z.enum(['natural', 'empresa']),
  nombre: z.string().min(1),
  nif: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const tipo = searchParams.get('tipo') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' as const } },
              { codigo: { contains: search, mode: 'insensitive' as const } },
              { nif: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(tipo ? { tipo } : {}),
    }

    const [total, clientes] = await Promise.all([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { nombre: 'asc' },
      }),
    ])

    return NextResponse.json({ data: clientes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = clienteSchema.parse(body)

    const cliente = await prisma.cliente.create({
      data: { ...data, empresa_id: empresaId, created_by: userId },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = clienteSchema.parse(rest)

    const cliente = await prisma.cliente.update({
      where: { id, empresa_id: empresaId },
      data: { ...data, updated_by: userId },
    })

    return NextResponse.json(cliente)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()

    await prisma.cliente.update({
      where: { id, empresa_id: empresaId },
      data: { activo: false },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 })
  }
}
