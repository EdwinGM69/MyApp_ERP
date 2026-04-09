import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reglaSchema = z.object({
  id: z.number().optional(),
  tipo_regla: z.string().min(1),
  umbral_valor: z.string().optional().nullable(),
  accion: z.string().optional().nullable(),
  orden: z.number().default(0),
  activo: z.boolean().default(true),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { empresaId } = await requireAuth(req)
    const reglas = await prisma.esquemaRegla.findMany({
      where: { esquema_id: Number(id), empresa_id: empresaId },
      orderBy: { orden: 'asc' }
    })
    return NextResponse.json({ data: reglas })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener reglas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const validated = reglaSchema.parse(body)

    const regla = await prisma.esquemaRegla.create({
      data: {
        ...validated,
        esquema_id: Number(id),
        empresa_id: empresaId,
        created_by: userId,
      }
    })

    // Log the creation
    await prisma.esquemaReglaLog.create({
      data: {
        empresa_id: empresaId,
        regla_id: regla.id,
        accion: 'creada',
        snapshot_log: {
          tipo_regla: { anterior: null, actual: validated.tipo_regla },
          umbral_valor: { anterior: null, actual: validated.umbral_valor },
          accion: { anterior: null, actual: validated.accion },
          orden: { anterior: null, actual: validated.orden },
          activo: { anterior: null, actual: validated.activo }
        },
        created_by: userId
      }
    })

    return NextResponse.json(regla, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/logistica/esquemas-valoracion/[id]/reglas] Error:', err)
    return NextResponse.json({ error: err.message || 'Error al crear la regla' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: esquemaId } = await params
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const validated = reglaSchema.parse(rest)

    const oldRegla = await prisma.esquemaRegla.findUnique({
      where: { id: Number(id), empresa_id: empresaId }
    })
    
    if (!oldRegla) {
      return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 })
    }

    const regla = await prisma.esquemaRegla.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { ...validated, updated_by: userId }
    })

    // Compare and log changes
    const snapshot: any = {}
    const fields = ['tipo_regla', 'umbral_valor', 'accion', 'orden', 'activo'] as const
    
    fields.forEach(field => {
      if (oldRegla[field] !== (validated as any)[field]) {
        snapshot[field] = {
          anterior: oldRegla[field],
          actual: (validated as any)[field]
        }
      }
    })

    if (Object.keys(snapshot).length > 0) {
      await prisma.esquemaReglaLog.create({
        data: {
          empresa_id: empresaId,
          regla_id: regla.id,
          accion: 'modificada',
          snapshot_log: snapshot,
          created_by: userId
        }
      })
    }

    return NextResponse.json(regla)
  } catch (err: any) {
    console.error('[PUT /api/logistica/esquemas-valoracion/[id]/reglas] Error:', err)
    return NextResponse.json({ error: err.message || 'Error al actualizar la regla' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: esquemaId } = await params
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const reglaId = searchParams.get('reglaId')

    await prisma.esquemaRegla.delete({
      where: { id: Number(reglaId), empresa_id: empresaId }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al eliminar la regla' }, { status: 500 })
  }
}
