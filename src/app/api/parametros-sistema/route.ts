import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const parametroSchema = z.object({
  empresa_id: z.coerce.number().optional().nullable(),
  nivel: z.enum(['SISTEMA', 'MODULO', 'EMPRESA', 'USUARIO']),
  modulo_id: z.coerce.number(),
  codigo: z.string().transform(val => val?.trim()).refine(val => val && val.length > 0, { message: 'El código es requerido' }),
  descripcion: z.string().transform(val => val?.trim()).refine(val => val && val.length > 0, { message: 'La descripción es requerida' }),
  tipo_dato: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON']),
  valor_string: z.string().optional().nullable(),
  valor_number: z.coerce.number().optional().nullable(),
  valor_boolean: z.boolean().optional().nullable(),
  valor_date: z.string().optional().nullable(),
  valor_json: z.any().optional().nullable(),
  editable: z.boolean().optional().default(true),
  requiere_reinicio: z.boolean().optional().default(false),
  etiqueta: z.string().transform(val => val?.trim()).refine(val => val && val.length > 0, { message: 'La etiqueta es requerida' }),
  activo: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''
    const nivel = searchParams.get('nivel')
    const moduloId = searchParams.get('moduloId')
    const activo = searchParams.get('activo')

    const where: any = {
      ...(nivel ? { nivel: nivel as any } : {}),
      ...(moduloId ? { modulo_id: parseInt(moduloId) } : {}),
      ...(activo !== null ? { activo: activo === 'true' } : {}),
      OR: [
        { empresa_id: null }, // System level
        { empresa_id: empresaId } // Company level
      ]
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { codigo: { contains: search, mode: 'insensitive' as const } },
            { descripcion: { contains: search, mode: 'insensitive' as const } },
            { etiqueta: { contains: search, mode: 'insensitive' as const } },
          ]
        }
      ]
    }

    const [total, parametros] = await Promise.all([
      prisma.parametroSistema.count({ where }),
      prisma.parametroSistema.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          empresa: { select: { id: true, nombre: true } },
          modulo: { select: { id: true, descripcion: true } },
          usuario_creador: { select: { id: true, nombre: true } },
          usuario_modificador: { select: { id: true, nombre: true } },
        },
      }),
    ])

    return NextResponse.json({ data: parametros, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('[GET /api/parametros-sistema] Error:', err)
    return NextResponse.json({ error: 'Error al obtener parámetros del sistema' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = parametroSchema.parse(body)

    // Validate uniqueness
    const existing = await prisma.parametroSistema.findFirst({
      where: {
        empresa_id: data.empresa_id,
        nivel: data.nivel,
        modulo_id: data.modulo_id,
        codigo: data.codigo,
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un parámetro con este código para el nivel y módulo especificado' }, { status: 400 })
    }

    const parametro = await prisma.parametroSistema.create({
      data: {
        ...data,
        empresa_id: data.empresa_id || null,
        created_by: userId,
      },
    })

    return NextResponse.json(parametro, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/parametros-sistema] Error:', err)
    if (err instanceof z.ZodError) {
      const errorMessages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: `Datos inválidos: ${errorMessages}` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear parámetro del sistema' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = parametroSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Validate uniqueness excluding current
    const existing = await prisma.parametroSistema.findFirst({
      where: {
        empresa_id: data.empresa_id,
        nivel: data.nivel,
        modulo_id: data.modulo_id,
        codigo: data.codigo,
        NOT: { id },
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un parámetro con este código para el nivel y módulo especificado' }, { status: 400 })
    }

    const parametro = await prisma.parametroSistema.update({
      where: { id },
      data: {
        ...data,
        empresa_id: data.empresa_id || null,
        updated_by: userId,
      },
    })

    return NextResponse.json(parametro)
  } catch (err: any) {
    console.error('[PUT /api/parametros-sistema] Error:', err)
    if (err instanceof z.ZodError) {
      const errorMessages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: `Datos inválidos: ${errorMessages}` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar parámetro del sistema' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await prisma.parametroSistema.update({
      where: { id: parseInt(id) },
      data: {
        activo: false,
        updated_by: userId
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/parametros-sistema] Error:', err)
    return NextResponse.json({ error: 'Error al desactivar parámetro del sistema' }, { status: 500 })
  }
}