import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const documentoSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  abreviatura: z.string().min(1, 'La abreviatura es requerida'),
  tipo: z.string(),
  activo: z.boolean().optional(),
  ruta_API: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const documento = await prisma.documentoIdentificacion.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: documento })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { abreviatura: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {}),
    }

    const [total, documentos] = await Promise.all([
      prisma.documentoIdentificacion.count({ where }),
      prisma.documentoIdentificacion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      }),
    ])

    return NextResponse.json({ data: documentos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    const data = documentoSchema.parse(body)

    const documento = await prisma.documentoIdentificacion.create({
      data: {
        ...data,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    return NextResponse.json(documento, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/logistica/documentos-identificacion] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('descripcion') ? 'descripción' : 'abreviatura'
      return NextResponse.json({ error: `Ya existe un documento con esta ${field}.` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el documento: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = documentoSchema.parse(rest)

    const documento = await prisma.documentoIdentificacion.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      },
    })
    return NextResponse.json(documento)
  } catch (err: any) {
    console.error('[PUT /api/logistica/documentos-identificacion] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('descripcion') ? 'descripción' : 'abreviatura'
      return NextResponse.json({ error: `Ya existe un documento con esta ${field}.` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el documento' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const body = await req.json()
    const { id } = body

    await prisma.documentoIdentificacion.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { activo: false }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al desactivar el documento' }, { status: 500 })
  }
}
