import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const sucursalSchema = z.object({
  descripcion: z.string().min(1, 'Descripción requerida'),
  direccion: z.string().optional(),
  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  activo: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const sucursales = await prisma.sucursal.findMany({
      where: { empresa_id: empresaId },
      include: {
        almacenes_vinculados: {
          include: {
            almacen: true
          }
        },
        cajas_vinculadas: {
          include: {
            caja: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    })
    return NextResponse.json(sucursales)
  } catch (err) {
    console.error('[GET /api/empresa/sucursales] Error:', err)
    return NextResponse.json({ error: 'Error al obtener sucursales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = sucursalSchema.parse(body)

    const sucursal = await prisma.sucursal.create({
      data: {
        ...data,
        empresa_id: empresaId,
        created_by: userId
      }
    })
    return NextResponse.json(sucursal, { status: 201 })
  } catch (err) {
    console.error('[POST /api/empresa/sucursales] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear sucursal' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = sucursalSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const sucursal = await prisma.sucursal.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId
      }
    })
    return NextResponse.json(sucursal)
  } catch (err) {
    console.error('[PUT /api/empresa/sucursales] Error:', err)
    return NextResponse.json({ error: 'Error al actualizar sucursal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.sucursal.delete({
      where: { id: Number(id), empresa_id: empresaId }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/empresa/sucursales] Error:', err)
    return NextResponse.json({ error: 'Error al eliminar sucursal' }, { status: 500 })
  }
}
