import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bancoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  pais_id: z.number().optional().nullable(),
  codigo_swift: z.string().optional().nullable(),
  activo: z.boolean().optional(),
  tipos_cuenta: z.array(z.object({
    id: z.number().optional(),
    descripcion: z.string().min(1)
  })).optional()
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const banco = await prisma.banco.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          pais: { select: { id: true, descripcion: true, abreviatura: true } },
          // @ts-ignore
          tipos_cuenta: { where: { activo: true }, orderBy: { descripcion: 'asc' } },
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: banco })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {}),
    }

    const [total, bancos] = await Promise.all([
      prisma.banco.count({ where }),
      prisma.banco.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
        include: {
          pais: { select: { id: true, descripcion: true, abreviatura: true } },
          // @ts-ignore
          tipos_cuenta: { where: { activo: true }, orderBy: { descripcion: 'asc' } },
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      }),
    ])

    return NextResponse.json({ data: bancos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error al obtener bancos: ' + err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    const validatedData = bancoSchema.parse(body)
    const { tipos_cuenta, ...data } = validatedData

    const banco = await prisma.banco.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId,
        tipos_cuenta: tipos_cuenta ? {
          create: tipos_cuenta.map((tc: any) => ({
            descripcion: tc.descripcion,
            created_by: userId
          }))
        } : undefined
      },
    })
    
    return NextResponse.json(banco, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if ((err as any).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un banco con esa descripción o código' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el banco: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, tipos_cuenta, ...rest } = body
    const validatedData = bancoSchema.parse(rest)

    const banco = await prisma.$transaction(async (tx: any) => {
      const { tipos_cuenta: _, ...finalData } = validatedData
      const updated = await tx.banco.update({
        where: { id: Number(id), empresa_id: empresaId },
        data: { 
          ...finalData, 
          updated_by: userId 
        },
      })

      if (tipos_cuenta) {
        // @ts-ignore
        await tx.tipoCuentaBanco.deleteMany({ where: { banco_id: Number(id) } })
        // @ts-ignore
        await tx.tipoCuentaBanco.createMany({
          data: tipos_cuenta.map((tc: any) => ({
            descripcion: tc.descripcion,
            banco_id: Number(id),
            created_by: userId
          }))
        })
      }

      return updated
    })

    return NextResponse.json(banco)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if ((err as any).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un banco con esa descripción o código' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el banco: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const body = await req.json()
    const { id } = body
    
    await prisma.banco.update({ 
        where: { id: Number(id), empresa_id: empresaId }, 
        data: { activo: false } 
    })
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al desactivar el banco' }, { status: 500 })
  }
}
