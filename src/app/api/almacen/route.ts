import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateMovNumber } from '@/lib/utils'

const movSchema = z.object({
  tipo: z.enum(['ingreso', 'salida']),
  almacen: z.string().optional(),
  documento: z.string().optional(),
  proveedor_id: z.number().optional().nullable(),
  referencia: z.string().optional(),
  observaciones: z.string().optional(),
  detalles: z.array(z.object({
    material_id: z.number().optional(),
    material_codigo: z.string().optional(),
    cantidad: z.number().positive(),
    costo_unit: z.number().optional().nullable(),
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
      ...(search ? { 
        OR: [
          { numero_mov: { contains: search, mode: 'insensitive' as const } },
          { referencia: { contains: search, mode: 'insensitive' as const } },
          { documento: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    }

    const [total, movimientos] = await Promise.all([
      prisma.movimientoAlmacen.count({ where }),
      prisma.movimientoAlmacen.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fecha: 'desc' },
        include: {
          proveedor: { select: { nombre: true } },
          detalles: { 
            include: { 
              material: { 
                select: { descripcion: true, codigo: true, unidad_medida: true } 
              } 
            } 
          },
        },
      }),
    ])

    return NextResponse.json({ 
      data: movimientos, 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const { detalles, ...movData } = movSchema.parse(body)

    const movimiento = await prisma.$transaction(async (tx) => {
      // Resolve material_id if only material_codigo is provided
      const resolvedDetalles = await Promise.all(detalles.map(async (d) => {
        if (d.material_id) return d;
        if (d.material_codigo) {
          const material = await tx.material.findUnique({
            where: { empresa_id_codigo: { empresa_id: empresaId, codigo: d.material_codigo } }
          });
          if (!material) throw new Error(`Material con código ${d.material_codigo} no encontrado`);
          return { ...d, material_id: material.id };
        }
        throw new Error('Debe proporcionar material_id o material_codigo');
      }));

      const mov = await tx.movimientoAlmacen.create({
        data: {
          ...movData,
          empresa_id: empresaId,
          numero_mov: generateMovNumber(),
          created_by: userId,
          detalles: { 
            create: resolvedDetalles.map((d) => ({ 
              material_id: d.material_id!,
              cantidad: d.cantidad,
              costo_unit: d.costo_unit,
              created_by: userId 
            })) 
          },
        },
      })

      for (const d of resolvedDetalles) {
        await tx.material.update({
          where: { id: d.material_id },
          data: {
            stock_actual: movData.tipo === 'ingreso'
              ? { increment: d.cantidad }
              : { decrement: d.cantidad },
          },
        })
      }

      return mov
    })

    return NextResponse.json(movimiento, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error al crear movimiento' }, { status: 500 })
  }
}
