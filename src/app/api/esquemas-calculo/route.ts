import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const variableSchema = z.object({
  id: z.number().optional(),
  variable_id: z.string().min(1),
  descripcion: z.string().min(1),
  tipo: z.string().min(1),
  valor: z.coerce.number().optional(),
  ingreso_manual: z.boolean().default(false),
})

const pasoSchema = z.object({
  id: z.number().optional(),
  secuencia_paso: z.coerce.number(),
  descripcion_corta: z.string().min(1),
  descripcion_larga: z.string().optional().nullable(),
  formula: z.string().min(1),
  tipo: z.string().min(1),
  activo: z.boolean().default(true),
  condicion_id: z.number().int().optional().nullable(),
})

const esquemaCalculoSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, "El código es obligatorio"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  activo: z.boolean().default(true),
  variables: z.array(variableSchema),
  pasos: z.array(pasoSchema),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (id) {
      const esquema = await prisma.esquemaCalculo.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          variables: { orderBy: { id: 'asc' } },
          pasos: { orderBy: { secuencia_paso: 'asc' } },
        },
      })
      return NextResponse.json({ data: esquema })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { codigo: { contains: search, mode: 'insensitive' as const } },
          { descripcion: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, esquemas] = await Promise.all([
      prisma.esquemaCalculo.count({ where }),
      prisma.esquemaCalculo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { codigo: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: esquemas,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener esquemas de cálculo' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = esquemaCalculoSchema.parse(body)

    const esquema = await prisma.esquemaCalculo.create({
      data: {
        empresa_id: empresaId,
        codigo: data.codigo,
        descripcion: data.descripcion,
        activo: data.activo,
        created_by: userId,
        variables: {
          create: data.variables.map(v => ({
            variable_id: v.variable_id,
            descripcion: v.descripcion,
            tipo: v.tipo,
            valor: v.valor,
            ingreso_manual: v.ingreso_manual,
            created_by: userId,
          })),
        },
        pasos: {
          create: data.pasos.map(p => ({
            secuencia_paso: p.secuencia_paso,
            descripcion_corta: p.descripcion_corta,
            descripcion_larga: p.descripcion_larga,
            formula: p.formula,
            tipo: p.tipo,
            activo: p.activo,
            condicion_id: p.condicion_id,
            created_by: userId,
          })),
        },
      },
      include: {
        variables: true,
        pasos: true,
      },
    })

    return NextResponse.json(esquema, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear esquema de cálculo: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...data } = body
    const validatedData = esquemaCalculoSchema.parse(data)

    // Transaction to update scheme and sync variables/steps
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing variables and steps associated with this scheme
      await tx.esquemaCalculoVariables.deleteMany({ where: { esquema_id: id } })
      await tx.esquemaCalculoPasos.deleteMany({ where: { esquema_id: id } })

      // Update scheme and create new variables/steps
      return tx.esquemaCalculo.update({
        where: { id, empresa_id: empresaId },
        data: {
          codigo: validatedData.codigo,
          descripcion: validatedData.descripcion,
          activo: validatedData.activo,
          updated_by: userId,
          variables: {
            create: validatedData.variables.map(v => ({
              variable_id: v.variable_id,
              descripcion: v.descripcion,
              tipo: v.tipo,
              valor: v.valor,
              ingreso_manual: v.ingreso_manual,
              created_by: userId,
            })),
          },
          pasos: {
            create: validatedData.pasos.map(p => ({
              secuencia_paso: p.secuencia_paso,
              descripcion_corta: p.descripcion_corta,
              descripcion_larga: p.descripcion_larga,
              formula: p.formula,
              tipo: p.tipo,
              activo: p.activo,
              condicion_id: p.condicion_id,
              created_by: userId,
            })),
          },
        },
        include: {
          variables: true,
          pasos: true,
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar esquema de cálculo: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    await prisma.esquemaCalculo.update({
      where: { id, empresa_id: empresaId },
      data: { activo: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al desactivar esquema de cálculo' }, { status: 500 })
  }
}
