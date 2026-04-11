import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const cajaSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  detalle_denominacion: z.boolean().optional(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const search = searchParams.get('search') ?? ''
    const sucursalId = searchParams.get('sucursalId')

    const where: any = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' as const } },
          { codigo: { contains: search, mode: 'insensitive' as const } },
          { id_caja: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    if (sucursalId) {
      where.sucursales_vinculadas = {
        some: {
          sucursal_id: parseInt(sucursalId),
          activo: true
        }
      }
    }

    const cajas = await prisma.caja.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ data: cajas })
  } catch (err) {
    console.error('[GET /api/tesoreria/cajas] Error:', err)
    return NextResponse.json({ error: 'Error al obtener cajas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = cajaSchema.parse(body)

    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.caja.findFirst({
          where: {
            empresa_id: empresaId,
            OR: orConditions
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe una caja con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe una caja con esta descripción.' }, { status: 400 })
        }
      }
    }

    const lastCaja = await prisma.caja.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { id: 'desc' }
    })
    const nextNumero = lastCaja ? lastCaja.id + 1 : 1

    const caja = await prisma.caja.create({
      data: {
        codigo: data.codigo || `C${nextNumero}`,
        descripcion: data.descripcion || `Caja ${nextNumero}`,
        detalle_denominacion: data.detalle_denominacion ?? false,
        activo: data.activo ?? true,
        empresa_id: empresaId,
        created_by: userId
      },
    })

    return NextResponse.json(caja, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/tesoreria/cajas] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear la caja', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = cajaSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    if (data.codigo || data.descripcion) {
      const orConditions = []
      if (data.codigo) orConditions.push({ codigo: { equals: data.codigo, mode: 'insensitive' as const } })
      if (data.descripcion) orConditions.push({ descripcion: { equals: data.descripcion, mode: 'insensitive' as const } })

      if (orConditions.length > 0) {
        const existente = await prisma.caja.findFirst({
          where: {
            empresa_id: empresaId,
            NOT: { id: Number(id) },
            OR: orConditions
          }
        })

        if (existente) {
          if (data.codigo && existente.codigo?.toLowerCase() === data.codigo.toLowerCase()) {
            return NextResponse.json({ error: 'Ya existe otra caja con este código.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Ya existe otra caja con esta descripción.' }, { status: 400 })
        }
      }
    }

    const caja = await prisma.caja.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        detalle_denominacion: data.detalle_denominacion,
        activo: data.activo,
        updated_by: userId
      },
    })

    return NextResponse.json(caja)
  } catch (err: any) {
    console.error('[PUT /api/tesoreria/cajas] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar la caja', details: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.caja.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.caja.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/tesoreria/cajas] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado de la caja' }, { status: 500 })
  }
}