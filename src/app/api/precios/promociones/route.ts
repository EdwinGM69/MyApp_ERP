import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const promocionSchema = z.object({
  codigo_promocion: z.string().min(1, 'El código de promoción es requerido'),
  nombre: z.string().min(1, 'El nombre de la promoción es requerido'),
  descripcion: z.string().optional().nullable(),
  tipo: z.enum(['2x1', 'Combo', 'Envío Gratis', 'Descuento %', '3x2']),
  fecha_inicio: z.coerce.date().or(z.string().transform(str => new Date(str))),
  fecha_fin: z.coerce.date().or(z.string().transform(str => new Date(str))).optional().nullable(),
  activo: z.boolean().optional(),
  detalles: z.array(z.object({
    id: z.number().optional().nullable(),
    material_id: z.number(),
    tipo_promocion: z.string().optional().nullable(),
    tipo_descuento: z.string().optional().nullable(),
    valor: z.number().optional().nullable(),
  })).optional()
})

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req)
    
    // In some cases requireAuth might return a redirect directly or have session data
    if (session instanceof Response) return session 
    
    // Fallback based on how requireAuth returns data in this project
    const sessionData = session as any;
    const empresaId = sessionData?.empresaId || sessionData?.user?.empresa_id || sessionData?.empresa_id;

    if (!empresaId) {
       return NextResponse.json({ error: 'No autorizado o falta empresaId' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const search = searchParams.get('search') ?? ''

    const where = {
      empresa_id: empresaId,
      ...(search ? {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' as const } },
          { codigo_promocion: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {}),
    }

    const [total, promociones] = await Promise.all([
      prisma.promocion.count({ where }),
      prisma.promocion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { detalles: true },
      }),
    ])

    return NextResponse.json({
      data: promociones,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error in GET /api/precios/promociones:', error);
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req)
    if (session instanceof Response) return session 
    
    // Fallback mapping
    const sessionData = session as any;
    const empresaId = sessionData?.empresaId || sessionData?.user?.empresa_id || sessionData?.empresa_id;
    const userId = sessionData?.userId || sessionData?.user?.id || sessionData?.id;
    
    if (!empresaId || !userId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { detalles, ...restData } = promocionSchema.parse(body)

    const promocion = await prisma.promocion.create({
      data: {
        ...restData,
        empresa_id: empresaId,
        created_by: userId,
        ...(detalles && detalles.length > 0 ? {
          detalles: {
            create: detalles.map(d => ({
              material_id: d.material_id,
              cantidad: 1, // Fallback to satisfy TS during schema generation
              tipo_promocion: d.tipo_promocion,
              tipo_descuento: d.tipo_descuento,
              valor: d.valor,
              created_by: userId
            }))
          }
        } : {})
      },
      include: { detalles: true }
    })

    return NextResponse.json(promocion, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ese ID Promo ya existe en la empresa' }, { status: 400 })
    }
    console.error('Error in POST /api/precios/promociones:', error);
    return NextResponse.json({ error: 'Error al crear la promoción' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req)
    if (session instanceof Response) return session 
    
    // Fallback mapping
    const sessionData = session as any;
    const empresaId = sessionData?.empresaId || sessionData?.user?.empresa_id || sessionData?.empresa_id;
    const userId = sessionData?.userId || sessionData?.user?.id || sessionData?.id;
    
    if (!empresaId || !userId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData } = body
    
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    const { detalles, ...restData } = promocionSchema.parse(updateData)

    const promocion = await prisma.$transaction(async (tx) => {
      if (detalles) {
        await tx.promocionDetalle.deleteMany({
          where: { promocion_id: Number(id) }
        })
      }
      
      return await tx.promocion.update({
        where: { id: Number(id), empresa_id: empresaId },
        data: {
          ...restData,
          updated_by: userId,
          ...(detalles ? {
            detalles: {
              create: detalles.map(d => ({
                material_id: d.material_id,
                cantidad: 1, // Fallback to satisfy TS 
                tipo_promocion: d.tipo_promocion,
                tipo_descuento: d.tipo_descuento,
                valor: d.valor,
                created_by: userId
              }))
            }
          } : {})
        },
        include: { detalles: true }
      })
    })

    return NextResponse.json(promocion)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ese ID Promo ya existe en la empresa' }, { status: 400 })
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })
    }
    console.error('Error in PUT /api/precios/promociones:', error);
    return NextResponse.json({ error: 'Error al actualizar la promoción' }, { status: 500 })
  }
}
