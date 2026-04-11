import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const associationSchema = z.object({
  sucursal_id: z.number(),
  almacen_id: z.number(),
  rol: z.string().default('secundario'),
  verificar_disponibilidad: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const data = associationSchema.parse(body)

    const association = await prisma.sucursalAlmacen.create({
      data: {
        ...data,
        created_by: userId,
        activo: true
      }
    })
    return NextResponse.json(association, { status: 201 })
  } catch (err) {
    console.error('[POST /api/empresa/sucursales/almacenes] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al vincular almacén' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.sucursalAlmacen.delete({
      where: { id: Number(id) }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/empresa/sucursales/almacenes] Error:', err)
    return NextResponse.json({ error: 'Error al desvincular almacén' }, { status: 500 })
  }
}
