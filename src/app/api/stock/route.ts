import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const stockMaterialSchema = z.object({
  sucursal_id: z.coerce.number(),
  almacen_id: z.coerce.number(),
  estado_stock_id: z.coerce.number(),
  material_id: z.coerce.number(),
  numero_lote: z.string().optional().nullable(),
  ubicacion_id: z.coerce.number(),
  unidad_medida_id: z.coerce.number(),
  cantidad: z.coerce.number(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const sucursalId = searchParams.get('sucursalId')
    const almacenId = searchParams.get('almacenId')
    const materialId = searchParams.get('materialId')
    const numeroLote = searchParams.get('numeroLote')
    const estadoStockId = searchParams.get('estadoStockId')
    const unidadMedidaId = searchParams.get('unidadMedidaId')
    const summary = searchParams.get('summary') === 'true'

    const where = {
      empresa_id: empresaId,
      ...(sucursalId ? { sucursal_id: Number(sucursalId) } : {}),
      ...(almacenId ? { almacen_id: Number(almacenId) } : {}),
      ...(materialId ? { material_id: Number(materialId) } : {}),
      ...(numeroLote ? { numero_lote: numeroLote } : {}),
      ...(estadoStockId ? { estado_stock_id: Number(estadoStockId) } : {}),
      ...(unidadMedidaId ? { unidad_medida_id: Number(unidadMedidaId) } : {}),
    }

    if (summary) {
      const agg = await prisma.stockMaterial.aggregate({
        where,
        _sum: { cantidad: true },
      })
      return NextResponse.json({ total: agg._sum.cantidad ?? 0 })
    }

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const [total, stock] = await Promise.all([
      prisma.stockMaterial.count({ where }),
      prisma.stockMaterial.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          material: { select: { descripcion: true, codigo: true } },
          sucursal: { select: { descripcion: true } },
          almacen: { select: { descripcion: true } },
          estado_stock: { select: { descripcion: true, codigo: true } },
          unidad_medida: { select: { descripcion: true, abreviatura: true } },
        },
        orderBy: { material: { descripcion: 'asc' } },
      }),
    ])

    return NextResponse.json({ data: stock, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('[GET /api/stock] Error:', err)
    return NextResponse.json({ error: 'Error al obtener stock' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    const data = stockMaterialSchema.parse(body)

    // Upsert logic for balance
    const existing = await prisma.stockMaterial.findFirst({
      where: {
        empresa_id: empresaId,
        sucursal_id: data.sucursal_id,
        almacen_id: data.almacen_id,
        ubicacion_id: data.ubicacion_id,
        estado_stock_id: data.estado_stock_id,
        material_id: data.material_id,
        numero_lote: data.numero_lote ?? null,
      }
    });

    let stock;
    if (existing) {
      stock = await prisma.stockMaterial.update({
        where: { id: existing.id },
        data: {
          cantidad: data.cantidad,
          unidad_medida_id: data.unidad_medida_id,
        }
      });
    } else {
      stock = await prisma.stockMaterial.create({
        data: {
          ...data,
          empresa_id: empresaId,
        }
      });
    }

    // Also record in history
    await prisma.stockMaterialHistorial.create({
      data: {
        ...data,
        empresa_id: empresaId,
      }
    })
    
    return NextResponse.json(stock, { status: 201 })
  } catch (err) {
    console.error('[POST /api/stock] Error:', err)
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar stock' }, { status: 500 })
  }
}
