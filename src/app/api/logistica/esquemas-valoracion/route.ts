import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const esquemaSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
  metodo_costo: z.string().optional().nullable(),
  decimal_precision: z.number().default(2),
  requiere_aprobacion: z.boolean().default(false),
  activo: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const esquema = await prisma.esquemaValoracion.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          reglas: { orderBy: { orden: 'asc' } },
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: esquema })
    }

    const search = searchParams.get('search') ?? ''
    const esquemas = await prisma.esquemaValoracion.findMany({
      where: {
        empresa_id: empresaId,
        OR: [
          { codigo: { contains: search, mode: 'insensitive' } },
          { nombre: { contains: search, mode: 'insensitive' } },
        ]
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ data: esquemas })
  } catch (err) {
    console.error('[GET /api/logistica/esquemas-valoracion] Error:', err)
    return NextResponse.json({ error: 'Error al obtener esquemas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const validated = esquemaSchema.parse(body)

    // Validar que no exista un esquema con el mismo codigo y nombre
    if (validated.codigo || validated.nombre) {
      const orConditions: Prisma.EsquemaValoracionWhereInput[] = []
      if (validated.codigo) orConditions.push({ codigo: { equals: validated.codigo, mode: 'insensitive' as Prisma.QueryMode } })
      if (validated.nombre) orConditions.push({ nombre: { equals: validated.nombre, mode: 'insensitive' as Prisma.QueryMode } })

      if (orConditions.length > 0) {
        const existente = await prisma.esquemaValoracion.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (validated.codigo && existente.codigo?.toLowerCase() === validated.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un esquema con este codigo.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un esquema con esta descripcion.' }, { status: 400 })
        }
      }
    }

    const esquema = await prisma.esquemaValoracion.create({
      data: {
        ...validated,
        empresa_id: empresaId,
        created_by: userId,
      }
    })

    // Log the creation
    await prisma.esquemaValoracionLog.create({
      data: {
        empresa_id: empresaId,
        esquema_id: esquema.id,
        motivo: 'Esquema creado',
        created_by: userId,
      }
    })

    return NextResponse.json(esquema, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return NextResponse.json({ error: 'El código del esquema ya existe' }, { status: 400 })
    }
    console.error('[POST /api/logistica/esquemas-valoracion] Error:', err)
    return NextResponse.json({ error: 'Error al crear el esquema' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const validated = esquemaSchema.parse(rest)

    // Validar que no exista otro esquema con el mismo codigo y nombre
    if (validated.codigo || validated.nombre) {
      const orConditions = []
      if (validated.codigo) orConditions.push({ codigo: { equals: validated.codigo, mode: 'insensitive' as Prisma.QueryMode } })
      if (validated.nombre) orConditions.push({ nombre: { equals: validated.nombre, mode: 'insensitive' as Prisma.QueryMode } })

      if (orConditions.length > 0) {
        const existente = await prisma.esquemaValoracion.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions,
          }
        })

        if (existente) {
          if (validated.codigo && existente.codigo?.toLowerCase() === validated.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe un esquema con este codigo.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe un esquema con esta descripcion.' }, { status: 400 })
        }
      }
    }

    const existing = await prisma.esquemaValoracion.findUnique({
      where: { id: Number(id), empresa_id: empresaId }
    })
    if (!existing) return NextResponse.json({ error: 'Esquema no encontrado' }, { status: 404 })

    const esquema = await prisma.esquemaValoracion.update({
      where: { id: Number(id) },
      data: {
        ...validated,
        updated_by: userId,
      }
    })

    // Log basic changes (simplified)
    if (existing.nombre !== validated.nombre) {
      await prisma.esquemaValoracionLog.create({
        data: {
          empresa_id: empresaId,
          esquema_id: esquema.id,
          campo_modificado: 'nombre',
          valor_anterior: existing.nombre,
          valor_nuevo: validated.nombre,
          motivo: 'Actualización de configuración',
          created_by: userId,
        }
      })
    }

    return NextResponse.json(esquema)
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return NextResponse.json({ error: 'El código del esquema ya existe' }, { status: 400 })
    }
    console.error('[PUT /api/logistica/esquemas-valoracion] Error:', err)
    return NextResponse.json({ error: 'Error al actualizar el esquema' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const esquema = await prisma.esquemaValoracion.findUnique({
      where: { id: Number(id), empresa_id: empresaId }
    })
    if (!esquema) return NextResponse.json({ error: 'Esquema no encontrado' }, { status: 404 })

    await prisma.esquemaValoracion.update({
      where: { id: Number(id) },
      data: {
        activo: !esquema.activo,
        updated_by: userId
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/logistica/esquemas-valoracion] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar el esquema' }, { status: 500 })
  }
}
