import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TIPOS_DOCUMENTO = ['PEDVTA', 'MOVALM', 'FACTURA', 'BOLETA', 'NOTACREDITO_FACTURA', 'NOTACREDITO_BOLETA', 'NOTA_DEBITO'] as const

const correlativoSchema = z.object({
  id: z.number().optional(),
  tipo_documento: z.enum(TIPOS_DOCUMENTO, { errorMap: () => ({ message: 'Tipo de documento inválido' }) }),
  serie: z.string().min(1, 'La serie es requerida').max(10, 'La serie no puede exceder 10 caracteres'),
  numero_actual: z.number().int().min(0, 'El número actual debe ser >= 0'),
  periodo_reinicio: z.enum(['ANUAL', 'MENSUAL', 'NUNCA']),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(0).max(12).default(0),
  ceros_relleno: z.number().int().min(1).max(20).default(8),
  activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const search = searchParams.get('search') ?? ''
    const tipoDocumento = searchParams.get('tipo_documento') ?? ''
    const serie = searchParams.get('serie') ?? ''
    const year = searchParams.get('year') ?? ''

    const where: any = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { serie: { contains: search, mode: 'insensitive' as const } },
          { tipo_documento: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
      ...(tipoDocumento ? { tipo_documento: tipoDocumento } : {}),
      ...(serie ? { serie: serie } : {}),
      ...(year ? { year: parseInt(year) } : {}),
    }

    const correlativos = await prisma.correlativo.findMany({
      where,
      orderBy: [{ tipo_documento: 'asc' }, { serie: 'asc' }, { year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({ data: correlativos })
  } catch (err) {
    console.error('[GET /api/comercial/correlativos] Error:', err)
    return NextResponse.json({ error: 'Error al obtener correlativos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/comercial/correlativos] body:', body)
    const data = correlativoSchema.parse(body)

    const correlativo = await prisma.correlativo.create({
      data: {
        tipo_documento: data.tipo_documento,
        serie: data.serie.toUpperCase(),
        numero_actual: data.numero_actual,
        periodo_reinicio: data.periodo_reinicio,
        year: data.year,
        month: data.month ?? 0,
        ceros_relleno: data.ceros_relleno ?? 8,
        activo: data.activo ?? true,
        empresa_id: empresaId,
        created_by: userId,
      },
    })

    return NextResponse.json(correlativo, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/comercial/correlativos] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un correlativo con esta combinación de tipo, serie, año y mes.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear el correlativo', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[PUT /api/comercial/correlativos] body:', body)
    const { id, ...rest } = body
    const data = correlativoSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const correlativo = await prisma.correlativo.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        tipo_documento: data.tipo_documento,
        serie: data.serie.toUpperCase(),
        numero_actual: data.numero_actual,
        periodo_reinicio: data.periodo_reinicio,
        year: data.year,
        month: data.month ?? 0,
        ceros_relleno: data.ceros_relleno ?? 8,
        activo: data.activo,
        updated_by: userId,
      },
    })

    return NextResponse.json(correlativo)
  } catch (err: any) {
    console.error('[PUT /api/comercial/correlativos] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un correlativo con esta combinación de tipo, serie, año y mes.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el correlativo', details: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.correlativo.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.correlativo.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: {
        activo: !current?.activo,
        updated_by: userId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/comercial/correlativos] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del correlativo' }, { status: 500 })
  }
}