import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const tipoCambioSchema = z.object({
  moneda_base: z.number().int().positive('Moneda base requerida'),
  moneda_cotizada: z.number().int().positive('Moneda cotizada requerida'),
  precio_compra: z.number().positive('Precio de compra requerido'),
  precio_venta: z.number().positive('Precio de venta requerido'),
  fuente_id: z.number().int().nullable().optional(),
  fecha_publicacion: z.string().datetime().nullable().optional(),
  inicio_vigencia: z.string().datetime().nullable().optional(),
  fin_vigencia: z.string().datetime().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const id = searchParams.get('id')
    if (id) {
      const tipoCambio = await prisma.tipoCambio.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          moneda_base_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          moneda_cotizada_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          fuente: { select: { id: true, nombre: true } },
          usuario_creador: { select: { nombre: true } },
          usuario_modificador: { select: { nombre: true } },
        }
      })
      return NextResponse.json({ data: tipoCambio })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { moneda_base_rel: { descripcion: { contains: search, mode: 'insensitive' as const } } },
          { moneda_cotizada_rel: { descripcion: { contains: search, mode: 'insensitive' as const } } },
        ]
      } : {}),
    }

    const [total, tiposCambio] = await Promise.all([
      prisma.tipoCambio.count({ where }),
      prisma.tipoCambio.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          moneda_base_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          moneda_cotizada_rel: { select: { id: true, descripcion: true, abreviatura: true, simbolo: true } },
          fuente: { select: { id: true, nombre: true } },
        },
      }),
    ])

    return NextResponse.json({ data: tiposCambio, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('Error fetching tipo cambio:', err)
    return NextResponse.json({ error: 'Error al obtener tipos de cambio' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    const data = tipoCambioSchema.parse(body)

    if (data.moneda_base === data.moneda_cotizada) {
      return NextResponse.json({ error: 'La moneda base y la moneda cotizada deben ser diferentes' }, { status: 400 })
    }

    const { tipoCambio, audit } = await prisma.$transaction(async (tx) => {
      // 1. Encontrar el registro anterior que esté vigente (sin fin_vigencia) para ese par de monedas
      const registroAnterior = await tx.tipoCambio.findFirst({
        where: {
          empresa_id: empresaId,
          moneda_base: data.moneda_base,
          moneda_cotizada: data.moneda_cotizada,
          fin_vigencia: null,
        },
        orderBy: { inicio_vigencia: 'desc' }
      })

      // 2. Crear el nuevo registro
      const nuevoRegistro = await tx.tipoCambio.create({
        data: {
          ...data,
          empresa_id: empresaId,
          created_by: userId,
          fecha_publicacion: data.fecha_publicacion ? new Date(data.fecha_publicacion) : undefined,
          inicio_vigencia: data.inicio_vigencia ? new Date(data.inicio_vigencia) : undefined,
          fin_vigencia: null, // Siempre null por requerimiento
        },
      })

      // 3. Si existe un registro anterior, actualizar su fin_vigencia y reemplazado_por
      if (registroAnterior && nuevoRegistro.inicio_vigencia) {
        const fechaFin = new Date(nuevoRegistro.inicio_vigencia)
        fechaFin.setDate(fechaFin.getDate() - 1)

        await tx.tipoCambio.update({
          where: { id: registroAnterior.id },
          data: {
            fin_vigencia: fechaFin,
            reemplazado_por: nuevoRegistro.id
          }
        })
      }

      const auditLog = await tx.tipoCambioAuditoria.create({
        data: {
          tipo_cambio_id: nuevoRegistro.id,
          action: 'INSERTAR',
          valor_anterior: Prisma.JsonNull,
          valor_nuevo: {
            moneda_base: data.moneda_base,
            moneda_cotizada: data.moneda_cotizada,
            precio_compra: data.precio_compra.toString(),
            precio_venta: data.precio_venta.toString(),
            fuente_id: data.fuente_id,
            fecha_publicacion: data.fecha_publicacion,
            inicio_vigencia: data.inicio_vigencia,
            fin_vigencia: null,
          },
          updated_by: userId,
        },
      })

      return { tipoCambio: nuevoRegistro, audit: auditLog }
    })

    return NextResponse.json(tipoCambio, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('Error creating tipo cambio:', err)
    return NextResponse.json({ error: 'Error al crear el tipo de cambio: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, ...rest } = body
    const data = tipoCambioSchema.parse(rest)

    const anterior = await prisma.tipoCambio.findUnique({
      where: { id, empresa_id: empresaId },
    })

    if (!anterior) {
      return NextResponse.json({ error: 'Tipo de cambio no encontrado' }, { status: 404 })
    }

    let action = 'ACTUALIZAR'
    if (
      (data.inicio_vigencia && !anterior.inicio_vigencia) ||
      (data.fin_vigencia && !anterior.fin_vigencia)
    ) {
      action = 'REEMPLAZAR'
    }

    const tipoCambio = await prisma.tipoCambio.update({
      where: { id, empresa_id: empresaId },
      data: {
        ...data,
        updated_by: userId,
        fecha_publicacion: data.fecha_publicacion ? new Date(data.fecha_publicacion) : undefined,
        inicio_vigencia: data.inicio_vigencia ? new Date(data.inicio_vigencia) : undefined,
        fin_vigencia: data.fin_vigencia ? new Date(data.fin_vigencia) : undefined,
      },
    })

    await prisma.tipoCambioAuditoria.create({
      data: {
        tipo_cambio_id: tipoCambio.id,
        action,
        valor_anterior: {
          moneda_base: anterior.moneda_base,
          moneda_cotizada: anterior.moneda_cotizada,
          precio_compra: anterior.precio_compra.toString(),
          precio_venta: anterior.precio_venta.toString(),
          fuente_id: anterior.fuente_id,
          fecha_publicacion: anterior.fecha_publicacion?.toISOString(),
          inicio_vigencia: anterior.inicio_vigencia?.toISOString(),
          fin_vigencia: anterior.fin_vigencia?.toISOString(),
        },
        valor_nuevo: {
          moneda_base: data.moneda_base,
          moneda_cotizada: data.moneda_cotizada,
          precio_compra: data.precio_compra.toString(),
          precio_venta: data.precio_venta.toString(),
          fuente_id: data.fuente_id,
          fecha_publicacion: data.fecha_publicacion,
          inicio_vigencia: data.inicio_vigencia,
          fin_vigencia: data.fin_vigencia,
        },
        updated_by: userId,
      },
    })

    return NextResponse.json(tipoCambio)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('Error updating tipo cambio:', err)
    return NextResponse.json({ error: 'Error al actualizar el tipo de cambio' }, { status: 500 })
  }
}
/*
export async function DELETE(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { id } = await req.json()
    // Como no hay campo 'activo', podríamos eliminarlo físicamente o usar un campo de estado si existiera.
    // Por ahora, lo eliminamos físicamente para cumplir con la acción de DELETE.
    await prisma.tipoCambio.delete({ where: { id, empresa_id: empresaId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar el tipo de cambio' }, { status: 500 })
  }
}
*/
