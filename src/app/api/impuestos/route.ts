import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const impuestoSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  porcentaje: z.coerce.number().min(0).max(100),
  tipo: z.string(),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const impuestos = await prisma.impuesto.findMany({
      where: { empresa_id: empresaId },
      orderBy: { descripcion: 'asc' },
    })
    return NextResponse.json({ data: impuestos })
  } catch {
    return NextResponse.json({ error: 'Error al obtener impuestos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = impuestoSchema.parse(body)
    const impuesto = await prisma.impuesto.create({ data: { ...data, empresa_id: empresaId, created_by: userId } })
    return NextResponse.json(impuesto, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear impuesto' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = impuestoSchema.parse(rest)
    const impuesto = await prisma.impuesto.update({ where: { id, empresa_id: empresaId }, data: { ...data, updated_by: userId } })
    return NextResponse.json(impuesto)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar impuesto' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.impuesto.update({ where: { id, empresa_id: empresaId }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar impuesto' }, { status: 500 })
  }
}
