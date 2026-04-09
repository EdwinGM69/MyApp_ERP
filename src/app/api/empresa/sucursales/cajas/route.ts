import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const associationSchema = z.object({
  sucursal_id: z.number(),
  caja_id: z.number(),
  activo: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)
    const body = await req.json()
    const data = associationSchema.parse(body)

    const association = await prisma.sucursalCaja.create({
      data: {
        ...data,
        created_by: userId
      }
    })
    return NextResponse.json(association, { status: 201 })
  } catch (err) {
    console.error('[POST /api/empresa/sucursales/cajas] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al vincular caja' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.sucursalCaja.delete({
      where: { id: Number(id) }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/empresa/sucursales/cajas] Error:', err)
    return NextResponse.json({ error: 'Error al desvincular caja' }, { status: 500 })
  }
}
