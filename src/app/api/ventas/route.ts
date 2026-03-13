import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ventaSchema = z.object({
  numero_pedido: z.string(),
  comprobante: z.string().optional(),
  cliente_id: z.number().optional().nullable(),
  estado: z.enum(['procesada', 'cotizacion', 'anulada']),
  subtotal: z.number(),
  impuesto: z.number(),
  descuento: z.number().optional(),
  total: z.number(),
  metodo_pago: z.string().optional(),
  observaciones: z.string().optional(),
  detalles: z.array(z.object({
    material_id: z.number(),
    cantidad: z.number(),
    precio_unit: z.number(),
    descuento: z.number().optional(),
    impuesto: z.number().optional(),
    subtotal: z.number(),
  })),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { numero_pedido: { contains: search, mode: 'insensitive' as const } },
        { comprobante: { contains: search, mode: 'insensitive' as const } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' as const } } },
      ]} : {}),
    }

    const [total, ventas] = await Promise.all([
      prisma.venta.count({ where }),
      prisma.venta.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fecha_venta: 'desc' },
        include: {
          cliente: { select: { nombre: true } },
          detalles: { include: { material: { select: { descripcion: true } } } },
        },
      }),
    ])

    return NextResponse.json({ data: ventas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { detalles, ...ventaData } = ventaSchema.parse(body)

    const venta = await prisma.$transaction(async (tx) => {
      const v = await tx.venta.create({
        data: {
          ...ventaData,
          empresa_id: empresaId,
          created_by: userId,
          detalles: { create: detalles.map((d) => ({ ...d, created_by: userId })) },
        },
      })

      // Update stock if sale is processed
      if (ventaData.estado === 'procesada') {
        for (const d of detalles) {
          await tx.material.update({
            where: { id: d.material_id },
            data: { stock_actual: { decrement: d.cantidad } },
          })
        }
      }

      return v
    })

    return NextResponse.json(venta, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 })
  }
}
