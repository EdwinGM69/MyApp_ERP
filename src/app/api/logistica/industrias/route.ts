import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const industriaSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const industria = await prisma.industria.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: industria })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        descripcion: { contains: search, mode: 'insensitive' as const }
      } : {}),
    }

    const [total, industrias] = await Promise.all([
      prisma.industria.count({ where }),
      prisma.industria.findMany({
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

    return NextResponse.json({ data: industrias, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener industrias' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    const data = industriaSchema.parse(body)

    const industria = await prisma.industria.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId 
      },
    })
    
    return NextResponse.json(industria, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una industria con esta descripción en la empresa.' }, { status: 400 })
    }
    console.error('Error al crear industria:', err)
    return NextResponse.json({ error: 'Error al crear la industria. Por favor intente nuevamente.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = industriaSchema.parse(rest)

    const industria = await prisma.industria.update({
      where: { id, empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId 
      },
    })
    return NextResponse.json(industria)
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una industria con esta descripción en la empresa.' }, { status: 400 })
    }
    console.error('Error al actualizar industria:', err)
    return NextResponse.json({ error: 'Error al actualizar la industria. Por favor intente nuevamente.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const body = await req.json()
    const { id } = body
    
    await prisma.industria.update({ 
        where: { id: Number(id), empresa_id: empresaId }, 
        data: { activo: false } 
    })
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al desactivar la industria' }, { status: 500 })
  }
}
