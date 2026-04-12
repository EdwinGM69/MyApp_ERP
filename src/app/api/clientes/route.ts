import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const clienteSchema = z.object({
  codigo: z.string().min(1),
  tipo: z.enum(['natural', 'empresa']),
  nombre: z.string().min(1),
  nombres_completos: z.string().nullable().optional(),
  apellidos_completos: z.string().nullable().optional(),
  nif: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional(),
  ubigeo: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  distrito: z.string().optional().nullable(),
  contacto: z.string().optional().nullable(),
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

    console.log('DEBUG API clientes - search:', search, 'encontrados:', total, 'pageSize:', pageSize)
    console.log('DEBUG API clientes - primer resultado:', clientes[0] ? JSON.stringify(clientes[0]) : 'sin datos')
    return NextResponse.json({ data: clientes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('DEBUG POST clientes - body recibido:', JSON.stringify(body))
    const data = clienteSchema.parse(body)

    // Validar que no exista un cliente con el mismo codigo o nombre
    if (data.codigo || data.nombre) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.nombre) orConditions.push({ nombre: { equals: data.nombre, mode: 'insensitive' as const } })
      if (data.nif) orConditions.push({ nif: { equals: data.nif, mode: 'insensitive' as const } })
      if (orConditions.length > 0) {
        const cliente = await prisma.cliente.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          },
        })

        if (cliente) {
          if (data.codigo && cliente.codigo.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo codigo' }, { status: 400 })
          }
          if (data.nombre && cliente.nombre.toLowerCase() === data.nombre.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo nombre' }, { status: 400 })
          }
          if (data.nif && cliente.nif && cliente.nif.toLowerCase() === data.nif.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo nif' }, { status: 400 })
          }
        }
      }
    }

    const cliente = await prisma.cliente.create({
      data: { ...data, empresa_id: empresaId, created_by: userId },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    console.log("POST Error:", err)
    return NextResponse.json({ error: 'Error al crear cliente: ' + (err as any).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = clienteSchema.parse(rest)

    // Validar que no exista un cliente con el mismo codigo o nombre
    if (data.codigo || data.nombre) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.nombre) orConditions.push({ nombre: { equals: data.nombre, mode: 'insensitive' as const } })
      if (data.nif) orConditions.push({ nif: { equals: data.nif, mode: 'insensitive' as const } })
      if (orConditions.length > 0) {
        const cliente = await prisma.cliente.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id },
            OR: orConditions,
          },
        })
        if (cliente) {
          if (data.codigo && cliente.codigo.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo codigo' }, { status: 400 })
          }
          if (data.nombre && cliente.nombre.toLowerCase() === data.nombre.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo nombre' }, { status: 400 })
          }
          if (data.nif && cliente.nif && cliente.nif.toLowerCase() === data.nif.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un cliente con el mismo nif' }, { status: 400 })
          }
        }
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id, empresa_id: empresaId },
      data: { ...data, updated_by: userId },
    })

    return NextResponse.json(cliente)
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    console.log("PUT Error:", err)
    return NextResponse.json({ error: 'Error al actualizar cliente: ' + (err as any).message }, { status: 500 })
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
