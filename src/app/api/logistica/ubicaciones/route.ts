import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ubicacionSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
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
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const totalResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM "Ubicacion"
      WHERE empresa_id = ${empresaId}
      ${search ? `AND (descripcion ILIKE '%${search}%' OR codigo ILIKE '%${search}%')` : ''}
    `)
    const total = totalResult[0].count

    const data: any[] = await prisma.$queryRawUnsafe(`
      SELECT u.*, uc.nombre as creador_nombre, um.nombre as modificador_nombre
      FROM "Ubicacion" u
      LEFT JOIN "Usuario" uc ON u.created_by = uc.id
      LEFT JOIN "Usuario" um ON u.updated_by = um.id
      WHERE u.empresa_id = ${empresaId}
      ${search ? `AND (u.descripcion ILIKE '%${search}%' OR u.codigo ILIKE '%${search}%')` : ''}
      ORDER BY u.codigo ASC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `)

    // Format to match Prisma structure
    const formattedData = data.map(u => ({
      ...u,
      usuario_creador: { nombre: u.creador_nombre },
      usuario_modificador: { nombre: u.modificador_nombre }
    }))

    return NextResponse.json({ data: formattedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('Error fetching ubicaciones:', err)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const validated = ubicacionSchema.parse(body)

    //Validar que no exista una ubicacion con el mismo codigo
    if (validated.codigo || validated.descripcion) {
      const orConditions = []
      if (validated.codigo) orConditions.push({ codigo: { equals: validated.codigo, mode: 'insensitive' as const } })
      if (validated.descripcion) orConditions.push({ descripcion: { equals: validated.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.ubicacion.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions,
          }
        })

        if (existente) {
          if (validated.codigo && existente.codigo?.toLowerCase() === validated.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una ubicación con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una ubicación con esta descripción.' }, { status: 400 })
        }
      }
    }


    const result: any[] = await prisma.$queryRaw`
      INSERT INTO "Ubicacion" (empresa_id, codigo, descripcion, activo, created_by, updated_by, created_at, updated_at)
      VALUES (${empresaId}, ${validated.codigo}, ${validated.descripcion}, ${validated.activo ?? true}, ${userId}, ${userId}, NOW(), NOW())
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    console.error('Error creating ubicacion:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: `Error al crear ubicación: ${err.message}` }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const validated = ubicacionSchema.parse(body)

    if (!validated.id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    //Validar que no exista una ubicacion con el mismo codigo
    if (validated.codigo || validated.descripcion) {
      const orConditions = []
      if (validated.codigo) orConditions.push({ codigo: { equals: validated.codigo, mode: 'insensitive' as const } })
      if (validated.descripcion) orConditions.push({ descripcion: { equals: validated.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.ubicacion.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: validated.id },
            OR: orConditions,
          }
        })

        if (existente) {
          if (validated.codigo && existente.codigo?.toLowerCase() === validated.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una ubicación con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una ubicación con esta descripción.' }, { status: 400 })
        }
      }
    }

    const result: any[] = await prisma.$queryRaw`
      UPDATE "Ubicacion"
      SET codigo = ${validated.codigo}, descripcion = ${validated.descripcion}, activo = ${validated.activo}, updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${validated.id} AND empresa_id = ${empresaId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (err: any) {
    console.error('Error updating ubicacion:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: `Error al actualizar ubicación: ${err.message}` }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.ubicacion.update({
      where: { id, empresa_id: empresaId },
      data: { activo: false }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error deleting ubicacion:', err)
    return NextResponse.json({ error: 'Error al desactivar ubicación' }, { status: 500 })
  }
}
