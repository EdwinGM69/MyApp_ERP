import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const marcaSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  abreviatura: z.string().optional().nullable(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const marca = await prisma.marca.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: marca })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, marcas] = await Promise.all([
      prisma.marca.count({ where }),
      prisma.marca.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({ data: marcas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener marcas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/marcas] Body:', body)

    const data = marcaSchema.parse(body)

    // Validar que no exista una marca con el mismo código o descripción
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.marca.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una marca con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una marca con esta descripción.' }, { status: 400 })
        }
      }
    }

    const marca = await prisma.marca.create({
      data: {
        ...data,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    console.log('[POST /api/marcas] Success:', marca)
    return NextResponse.json(marca, { status: 201 })
  } catch (err) {
    console.error('[POST /api/marcas] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear la marca: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = marcaSchema.parse(rest)

    // Validar que no exista una marca con el mismo código o descripción
    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.marca.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un concepto con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un concepto con esta descripción.' }, { status: 400 })
        }
      }
    }

    const marca = await prisma.marca.update({
      where: { id, empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })
    return NextResponse.json(marca)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar la marca' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.marca.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar la marca' }, { status: 500 })
  }
}
