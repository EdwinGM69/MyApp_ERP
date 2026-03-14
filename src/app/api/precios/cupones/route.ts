import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const cuponSchema = z.object({
  codigo_cupon: z.string().min(1),
  codigo: z.string().min(1),
  tipo: z.enum(['PORCENTAJE', 'MONTO FIJO']),
  valor: z.coerce.number().min(0),
  moneda: z.string().default('USD'),
  limite_uso: z.coerce.number().optional().nullable(),
  fecha_inicio: z.coerce.date().or(z.string().transform(str => new Date(str))),
  fecha_fin: z.coerce.date().or(z.string().transform(str => new Date(str))).optional().nullable(),
  activo: z.boolean().optional(),
  detalles: z.array(z.object({
    material_id: z.coerce.number()
  })).optional()
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
        { codigo: { contains: search, mode: 'insensitive' as const } },
        { codigo_cupon: { contains: search, mode: 'insensitive' as const } }
      ]} : {}),
    }

    const [total, cupones] = await Promise.all([
      prisma.cupon.count({ where }),
      prisma.cupon.findMany({
        where,
        include: {
          detalles: {
            include: { material: true }
          }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
    ])

    return NextResponse.json({ data: cupones, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { detalles, ...data } = cuponSchema.parse(body)

    const cupon = await prisma.cupon.create({
      data: { 
        ...data, 
        empresa_id: empresaId, 
        created_by: userId,
        detalles: detalles && detalles.length > 0 ? {
          create: detalles.map(d => ({
            material_id: d.material_id,
            created_by: userId
          }))
        } : undefined
      },
      include: { detalles: true }
    })

    return NextResponse.json(cupon, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear cupón' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { id, detalles, ...rest } = body
    const data = cuponSchema.parse(rest)

    const cupon = await prisma.cupon.update({
      where: { id, empresa_id: empresaId },
      data: { 
        ...data, 
        updated_by: userId,
        detalles: detalles ? {
          deleteMany: {},
          create: detalles.map((d: any) => ({
            material_id: d.material_id,
            created_by: userId,
            updated_by: userId
          }))
        } : undefined
      },
      include: { detalles: true }
    })
    return NextResponse.json(cupon)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar cupón' }, { status: 500 })
  }
}
