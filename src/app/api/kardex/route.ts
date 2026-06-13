import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const materialIds = searchParams.get('materialIds')?.split(',').map(Number).filter(Boolean) || []
    const marcaIds = searchParams.get('marcaIds')?.split(',').map(Number).filter(Boolean) || []
    const categoriaIds = searchParams.get('categoriaIds')?.split(',').map(Number).filter(Boolean) || []
    const tipoIds = searchParams.get('tipoIds')?.split(',').map(Number).filter(Boolean) || []

    const where: any = {
      movimiento: {
        empresa_id: Number(empresaId),
      },
    }

    if (materialIds.length > 0) {
      where.material_id = { in: materialIds }
    }

    if (marcaIds.length > 0 || categoriaIds.length > 0 || tipoIds.length > 0) {
      where.material = {}
      if (marcaIds.length > 0) where.material.marca_id = { in: marcaIds }
      if (categoriaIds.length > 0) where.material.categoria_id = { in: categoriaIds }
      if (tipoIds.length > 0) where.material.tipo_id = { in: tipoIds }
    }

    if (fechaDesde || fechaHasta) {
      where.movimiento = {
        ...where.movimiento,
        fecha: {
          ...(fechaDesde ? { gte: new Date(`${fechaDesde}T00:00:00.000Z`) } : {}),
          ...(fechaHasta ? { lte: new Date(`${fechaHasta}T23:59:59.999Z`) } : {}),
        },
      }
    }

    const [total, detalles] = await Promise.all([
      prisma.movimientoAlmacenDetalle.count({ where }),
      prisma.movimientoAlmacenDetalle.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { material_id: 'asc' },
          { movimiento: { fecha: 'desc' } },
          { movimiento: { created_at: 'desc' } },
          { id: 'desc' },
        ],
        include: {
          movimiento: {
            include: {
              tipo_operacion: {
                select: { codigo: true, descripcion: true, signo_origen: true, categoria: true },
              },
              sucursal: { select: { descripcion: true } },
            },
          },
          material: {
            select: {
              id: true,
              codigo: true,
              descripcion: true,
              marca_id: true,
              categoria_id: true,
              tipo_id: true,
            },
          },
          unidad_medida: { select: { id: true, descripcion: true, abreviatura: true } },
          estado_stock: { select: { descripcion: true, codigo: true } },
          distribuciones: {
            take: 1,
            include: {
              ubicacion: { select: { codigo: true, descripcion: true } },
            },
          },
        },
      }),
    ])

    // Fetch almacenes for the distinct almacen_ids in the results
    const almacenIds = [...new Set(detalles.map((d) => d.almacen_id))]
    const almacenes = almacenIds.length > 0
      ? await prisma.almacen.findMany({
          where: { id: { in: almacenIds }, empresa_id: Number(empresaId) },
          select: { id: true, descripcion: true },
        })
      : []
    const almacenMap = new Map(almacenes.map((a) => [a.id, a]))

    const data = detalles.map((d) => ({
      id: d.id,
      movimiento_id: d.movimiento_id,
      material_id: d.material_id,
      cantidad: Number(d.cantidad),
      costo_unit: d.costo_unit ? Number(d.costo_unit) : null,
      numero_lote: d.numero_lote,
      linea: d.linea,
      almacen_id: d.almacen_id,
      almacen: almacenMap.get(d.almacen_id) ?? null,
      ubicacion_codigo: d.distribuciones?.[0]?.ubicacion?.codigo ?? null,
      movimiento: d.movimiento,
      material: d.material,
      unidad_medida: d.unidad_medida,
      estado_stock: d.estado_stock,
      distribuciones: d.distribuciones,
    }))

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('[GET /api/kardex] Error:', err)
    return NextResponse.json({ error: 'Error al obtener kardex' }, { status: 500 })
  }
}
