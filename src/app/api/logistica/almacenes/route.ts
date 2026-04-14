import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const almacenSchema = z.object({
  id: z.number().optional(),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const almacen = await prisma.almacen.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })

      if (almacen) {
        // Fetch linked locations via raw SQL because Prisma Client is outdated
        const links = await prisma.$queryRaw`
          SELECT au.*, u.codigo, u.descripcion as ubicacion_descripcion
          FROM "AlmacenUbicacion" au
          JOIN "Ubicacion" u ON au.ubicacion_id = u.id
          WHERE au.almacen_id = ${Number(id)} AND au.empresa_id = ${empresaId} AND au.activo = true
        `

        // Map to common structure
        const formattedLinks = (links as any[]).map((link: any) => ({
          id: link.id,
          ubicacion_id: link.ubicacion_id,
          activo: link.activo,
          Ubicacion: {
            id: link.ubicacion_id,
            codigo: link.codigo,
            descripcion: link.ubicacion_descripcion
          }
        }))

          // Attach to object
          ; (almacen as any).almacenUbicaciones = formattedLinks
      }

      return NextResponse.json({ data: almacen })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const sucursalId = searchParams.get('sucursalId')

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        descripcion: { contains: search, mode: 'insensitive' as const }
      } : {}),
      ...(sucursalId ? {
        sucursales_vinculadas: {
          some: {
            sucursal_id: parseInt(sucursalId),
            activo: true
          }
        }
      } : {}),
    }

    const [total, almacenes] = await Promise.all([
      prisma.almacen.count({ where }),
      prisma.almacen.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { descripcion: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: almacenes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (err) {
    console.error('[GET /api/logistica/almacenes] Error:', err)
    return NextResponse.json({ error: 'Error al obtener almacenes: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/logistica/almacenes] Body:', body)
    const { ubicacion_ids, ...rest } = body
    const data = almacenSchema.parse(rest)

    // Validar que no exista un almacen con la misma descripcion
    if (data.descripcion) {
      const existente = await prisma.almacen.findFirst({
        where: {
          empresa_id: empresaId,
          descripcion: { equals: data.descripcion, mode: 'insensitive' as const },
        }
      })

      if (existente) {
        return NextResponse.json({ error: 'Ya existe un almacén con esta descripción.' }, { status: 400 })
      }
    }

    const almacen = await prisma.$transaction(async (tx: any) => {
      const created = await tx.almacen.create({
        data: {
          ...data,
          empresa_id: empresaId,
          created_by: userId,
        },
      })

      if (ubicacion_ids && ubicacion_ids.length > 0) {
        for (const uId of ubicacion_ids) {
          await tx.$executeRaw`
            INSERT INTO "AlmacenUbicacion" (empresa_id, almacen_id, ubicacion_id, activo, created_by, created_at, updated_at)
            VALUES (${empresaId}, ${created.id}, ${uId}, true, ${userId}, NOW(), NOW())
          `
        }
      }
      return created
    })

    return NextResponse.json(almacen, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/logistica/almacenes] Full Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un almacén con esa descripción.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el almacén: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ubicacion_ids, ...restBody } = body
    const data = almacenSchema.parse(restBody)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Validar que no exista un almacen con la misma descripcion
    if (data.descripcion) {
      const existente = await prisma.almacen.findFirst({
        where: {
          empresa_id: empresaId,
          NOT: { id: Number(id) },
          descripcion: { equals: data.descripcion, mode: 'insensitive' as const },
        }
      })

      if (existente) {
        return NextResponse.json({ error: 'Ya existe un almacén con esta descripción.' }, { status: 400 })
      }
    }

    const almacen = await prisma.$transaction(async (tx: any) => {
      // Update main data
      const updated = await tx.almacen.update({
        where: { id: Number(id), empresa_id: empresaId },
        data: {
          ...data,
          updated_by: userId
        },
      })

      // Sync Ubicaciones
      if (ubicacion_ids !== undefined) {
        // Deactivate old ones
        await tx.$executeRaw`
          UPDATE "AlmacenUbicacion"
          SET activo = false, updated_by = ${userId}, updated_at = NOW()
          WHERE almacen_id = ${Number(id)} AND empresa_id = ${empresaId} AND activo = true
        `

        // Create or reactivate new ones
        for (const uId of ubicacion_ids) {
          const existing: any[] = await tx.$queryRaw`
            SELECT id FROM "AlmacenUbicacion"
            WHERE almacen_id = ${Number(id)} AND ubicacion_id = ${uId} AND empresa_id = ${empresaId}
            LIMIT 1
          `

          if (existing.length > 0) {
            await tx.$executeRaw`
              UPDATE "AlmacenUbicacion"
              SET activo = true, updated_by = ${userId}, updated_at = NOW()
              WHERE id = ${existing[0].id}
            `
          } else {
            await tx.$executeRaw`
              INSERT INTO "AlmacenUbicacion" (empresa_id, almacen_id, ubicacion_id, activo, created_by, created_at, updated_at)
              VALUES (${empresaId}, ${Number(id)}, ${uId}, true, ${userId}, NOW(), NOW())
            `
          }
        }
      }

      return updated
    })

    return NextResponse.json(almacen)
  } catch (err: any) {
    console.error('[PUT /api/logistica/almacenes] Error:', err)
    return NextResponse.json({ error: 'Error al actualizar el almacén: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.almacen.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.almacen.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/logistica/almacenes] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del almacén: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
