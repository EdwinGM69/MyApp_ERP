import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const condicionesSchema = z.object({
  tipo_condicion_id: z.coerce.number().int(),
  material_id: z.coerce.number().int(),
  moneda_id: z.coerce.number().int(),
  porcentaje: z.boolean().default(false),
  valor: z.coerce.number().min(0),
  fecha_desde: z.string().transform((v) => new Date(v)),
  fecha_hasta: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  activo: z.boolean().optional(),
})

// Valida superposicion de fechas para nueva condicion
async function validarSuperposicionFechas(
  empresaId: number,
  tipoCondicionId: number,
  materialId: number,
  monedaId: number,
  fechaDesde: Date,
  fechaHasta: Date | null,
  excludeId?: number
) {
  // Buscar condiciones existentes con mismos keys
  const condicionesExistentes = await prisma.condicion.findMany({
    where: {
      empresa_id: empresaId,
      tipo_condicion_id: tipoCondicionId,
      material_id: materialId,
      moneda_id: monedaId,
      activo: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, fecha_desde: true, fecha_hasta: true },
  })
  for (const cond of condicionesExistentes) {
    const desdeExistente = cond.fecha_desde
    const hastaExistente = cond.fecha_hasta
    // Si la nueva fecha_desde es <= hasta del existente (o hasta es null =sin límite)
    const fechaHastaValida = hastaExistente || new Date('2099-12-31')
    if (fechaDesde <= fechaHastaValida) {
      return {
        valido: false,
        mensaje: `Ya existe una condición activa para este período (${desdeExistente.toISOString().split('T')[0]} - ${hastaExistente ? hastaExistente.toISOString().split('T')[0] : 'indefinido'})`
      }
    }
  }
  return { valido: true, mensaje: '' }
}

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const tipoCondicionId = searchParams.get('tipo_condicion_id')
    const materialIdsParam = searchParams.get('materialIds')
    const materialId = searchParams.get('material_id')
    
    let materialIds: number[] = []
    if (materialIdsParam) {
      materialIds = materialIdsParam.split(',').map(Number).filter(n => !isNaN(n))
    }

    const now = new Date()
    
    const where: any = {
      empresa_id: empresaId,
      activo: true,
      fecha_desde: { lte: now },
      ...(tipoCondicionId ? { tipo_condicion_id: Number(tipoCondicionId) } : {}),
    }
    
    if (materialIds.length > 0) {
      where.OR = [
        { material_id: { in: materialIds } },
        { material_id: null }
      ]
    } else if (materialId) {
      where.material_id = Number(materialId)
    }

    const condiciones = await prisma.condicion.findMany({
      where,
      include: {
        material: { select: { descripcion: true, codigo: true } },
        moneda: { select: { simbolo: true, abreviatura: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ data: condiciones })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener condiciones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = condicionesSchema.parse(body)

    const { tipo_condicion_id, moneda_id, material_id, ...cleanData } = data

    // Validar superposición de fechas antes de crear
    const validacion = await validarSuperposicionFechas(
      empresaId,
      data.tipo_condicion_id,
      data.material_id,
      data.moneda_id,
      data.fecha_desde,
      data.fecha_hasta
    )
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.mensaje }, { status: 409 })
    }

    const condicion = await prisma.condicion.create({
      data: {
        ...cleanData,
        empresa: { connect: { id: empresaId } },
        tipo_condicion: { connect: { id: tipo_condicion_id } },
        moneda: { connect: { id: moneda_id } },
        ...(material_id ? { material: { connect: { id: material_id } } } : {}),
        usuario_creador: { connect: { id: userId } },
      },
      include: {
        material: { select: { descripcion: true, codigo: true } },
        moneda: { select: { simbolo: true, abreviatura: true } },
      }
    })

    return NextResponse.json(condicion, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear la condición: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...restBody } = body
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    const data = condicionesSchema.parse(restBody)

    const { tipo_condicion_id, moneda_id, material_id, ...cleanDataUpdate } = data

    // Validar superposicion de fechas antes de actualizar (excluyendo el registro actual)
    const validacion = await validarSuperposicionFechas(
      empresaId,
      data.tipo_condicion_id,
      data.material_id,
      data.moneda_id,
      data.fecha_desde,
      data.fecha_hasta,
      id // excludeId
    )
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.mensaje }, { status: 409 })
    }

    const condicion = await prisma.condicion.update({
      where: { id, empresa_id: empresaId },
      data: {
        ...cleanDataUpdate,
        tipo_condicion: { connect: { id: tipo_condicion_id } },
        moneda: { connect: { id: moneda_id } },
        ...(material_id ? { material: { connect: { id: material_id } } } : { material: { disconnect: true } }),
        usuario_modificador: { connect: { id: userId } },
      },
      include: {
        material: { select: { descripcion: true, codigo: true } },
        moneda: { select: { simbolo: true, abreviatura: true } },
      }
    })

    return NextResponse.json(condicion)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar la condición' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.condicion.update({
      where: { id, empresa_id: empresaId },
      data: { activo: false }
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar la condición' }, { status: 500 })
  }
}
