import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const clasePedidoSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, 'El código es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  esquema_id: z.coerce.number().min(1, 'El esquema de cálculo es requerido'),
  estado_stock_id: z.coerce.number().nullable().optional().transform(v => v === 0 ? null : v),
  tipo_operacion_id: z.coerce.number().nullable().optional().transform(v => v === 0 ? null : v),
  concepto_caja_id: z.coerce.number().nullable().optional().transform(v => v === 0 ? null : v),
  operacion_extorno_id: z.coerce.number().nullable().optional().transform(v => v === 0 ? null : v),
  concepto_extorno_id: z.coerce.number().nullable().optional().transform(v => v === 0 ? null : v),
  registro_almacen: z.boolean().optional(),
  registro_caja: z.boolean().optional(),
  activo: z.boolean().optional(),
}).refine(data => {
  if (data.registro_almacen && !data.tipo_operacion_id) return false
  return true
}, {
  message: 'Seleccione un tipo de operación para almacén',
  path: ['tipo_operacion_id']
}).refine(data => {
  if (data.registro_caja && !data.concepto_caja_id) return false
  return true
}, {
  message: 'Seleccione un concepto de caja',
  path: ['concepto_caja_id']
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const search = searchParams.get('search') ?? ''
    
    const where = {
      empresa_id: empresaId,
      ...(search ? { OR: [
        { descripcion: { contains: search, mode: 'insensitive' as const } },
        { codigo: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
    }

    const clasePedidos = await prisma.clasePedido.findMany({
      where,
      include: {
        esquema: {
          select: { id: true, descripcion: true, codigo: true }
        },
        estado_stock: {
          select: { id: true, descripcion: true, codigo: true }
        },
        tipo_operacion: {
          select: { id: true, descripcion: true, codigo: true }
        },
        concepto_caja: {
          select: { id: true, descripcion: true, codigo: true }
        },
        operacion_extorno: {
          select: { id: true, descripcion: true, codigo: true }
        },
        concepto_extorno: {
          select: { id: true, descripcion: true, codigo: true }
        }
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ data: clasePedidos })
  } catch (err) {
    console.error('[GET /api/comercial/clases-pedido] Error:', err)
    return NextResponse.json({ error: 'Error al obtener clases de pedido' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[POST /api/comercial/clases-pedido] body:', body)
    const data = clasePedidoSchema.parse(body)

    const registroAlmacen = data.registro_almacen ?? false
    const registroCaja = data.registro_caja ?? false
    const tipoOperacionId = registroAlmacen ? data.tipo_operacion_id : null
    const conceptoCajaId = registroCaja ? data.concepto_caja_id : null

    const clasePedido = await prisma.clasePedido.create({
      data: { 
        codigo: data.codigo,
        descripcion: data.descripcion,
        esquema_id: data.esquema_id,
        estado_stock_id: data.estado_stock_id ?? null,
        tipo_operacion_id: tipoOperacionId ?? null,
        concepto_caja_id: conceptoCajaId ?? null,
        operacion_extorno_id: data.operacion_extorno_id ?? null,
        concepto_extorno_id: data.concepto_extorno_id ?? null,
        registro_almacen: registroAlmacen,
        registro_caja: registroCaja,
        activo: data.activo ?? true,
        empresa_id: empresaId,
        created_by: userId 
      },
    })
    
    return NextResponse.json(clasePedido, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/comercial/clases-pedido] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'El código de la clase de pedido ya existe para esta empresa.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear la clase de pedido', details: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    console.log('[PUT /api/comercial/clases-pedido] body:', body)
    const { id, ...rest } = body
    const data = clasePedidoSchema.parse(rest)

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const registroAlmacen = data.registro_almacen ?? false
    const registroCaja = data.registro_caja ?? false
    const tipoOperacionId = registroAlmacen ? data.tipo_operacion_id : null
    const conceptoCajaId = registroCaja ? data.concepto_caja_id : null

    const clasePedido = await prisma.clasePedido.update({
      where: { id: Number(id), empresa_id: empresaId },
      data: { 
        codigo: data.codigo,
        descripcion: data.descripcion,
        esquema_id: data.esquema_id,
        estado_stock_id: data.estado_stock_id ?? null,
        tipo_operacion_id: tipoOperacionId ?? null,
        concepto_caja_id: conceptoCajaId ?? null,
        operacion_extorno_id: data.operacion_extorno_id ?? null,
        concepto_extorno_id: data.concepto_extorno_id ?? null,
        registro_almacen: registroAlmacen,
        registro_caja: registroCaja,
        activo: data.activo,
        updated_by: userId 
      },
    })
    
    return NextResponse.json(clasePedido)
  } catch (err: any) {
    console.error('[PUT /api/comercial/clases-pedido] Error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar la clase de pedido', details: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const current = await prisma.clasePedido.findUnique({
      where: { id: Number(id), empresa_id: empresaId },
      select: { activo: true }
    })

    await prisma.clasePedido.update({ 
      where: { id: Number(id), empresa_id: empresaId }, 
      data: { 
        activo: !current?.activo,
        updated_by: userId
      } 
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/comercial/clases-pedido] Error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado de la clase de pedido' }, { status: 500 })
  }
}
