import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const tipo = searchParams.get('tipo') || 'transacciones'
    const cajaId = searchParams.get('cajaId')
    const fechaDesde = searchParams.get('fecha_desde')
    const fechaHasta = searchParams.get('fecha_hasta')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const skip = (page - 1) * pageSize

    if (tipo === 'historial') {
      const where: any = { caja: { empresa_id: empresaId } }
      if (cajaId) where.caja_id = parseInt(cajaId)
      if (fechaDesde || fechaHasta) {
        where.fecha_apertura = {}
        if (fechaDesde) where.fecha_apertura.gte = new Date(`${fechaDesde}T00:00:00.000Z`)
        if (fechaHasta) where.fecha_apertura.lte = new Date(`${fechaHasta}T23:59:59.999Z`)
      }

      const [data, total] = await Promise.all([
        prisma.cajaGestion.findMany({
          where,
          include: {
            caja: { select: { id: true, codigo: true, descripcion: true } },
            moneda: { select: { id: true, descripcion: true, simbolo: true } },
            usuario_apertura: { select: { id: true, nombre: true } },
          },
          orderBy: { fecha_apertura: 'asc' },
          skip,
          take: pageSize,
        }),
        prisma.cajaGestion.count({ where }),
      ])

      const cierreUserIds = data
        .map((s) => s.usuario_cierre_id)
        .filter((id): id is number => id != null)

      let cierreUsers: Map<number, string> = new Map()
      if (cierreUserIds.length > 0) {
        const users = await prisma.usuario.findMany({
          where: { id: { in: cierreUserIds } },
          select: { id: true, nombre: true },
        })
        users.forEach((u) => cierreUsers.set(u.id, u.nombre))
      }

      const mapped = data.map((s) => ({
        id: s.id,
        caja: s.caja,
        moneda: s.moneda,
        estado: s.estado,
        fecha_apertura: s.fecha_apertura,
        monto_apertura: s.monto_apertura,
        usuario_apertura: s.usuario_apertura,
        fecha_cierre: s.fecha_cierre,
        monto_cierre: s.monto_cierre,
        usuario_cierre: s.usuario_cierre_id
          ? { id: s.usuario_cierre_id, nombre: cierreUsers.get(s.usuario_cierre_id) || '---' }
          : null,
      }))

      return NextResponse.json({ data: mapped, total })
    }

    const where: any = { empresa_id: empresaId }
    if (cajaId) where.caja_id = parseInt(cajaId)
    if (fechaDesde || fechaHasta) {
      where.fecha_documento = {}
      if (fechaDesde) where.fecha_documento.gte = new Date(`${fechaDesde}T00:00:00.000Z`)
      if (fechaHasta) where.fecha_documento.lte = new Date(`${fechaHasta}T23:59:59.999Z`)
    }

    const [data, total] = await Promise.all([
      prisma.transaccionCaja.findMany({
        where,
        include: {
          concepto: { select: { id: true, codigo: true, descripcion: true, tipo_operacion: true } },
          moneda: { select: { id: true, descripcion: true, simbolo: true } },
          usuario_creador: { select: { id: true, nombre: true } },
          cliente: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          sesion: { select: { id: true } },
        },
        orderBy: { fecha_documento: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.transaccionCaja.count({ where }),
    ])

    const mapped = data.map((t) => ({
      id: t.id,
      numero_documento: t.numero_documento,
      fecha_documento: t.fecha_documento,
      motivo: t.motivo,
      importe: t.importe,
      estado: t.estado,
      concepto: t.concepto,
      moneda: t.moneda,
      usuario_creador: t.usuario_creador,
      cliente: t.cliente,
      proveedor: t.proveedor,
      sesion: t.sesion,
      referencia: t.numero_documento || t.motivo || '---',
    }))

    return NextResponse.json({ data: mapped, total })
  } catch (err: any) {
    console.error('[GET /api/consultas/transacciones-caja] Error:', err)
    return NextResponse.json({ error: 'Error al consultar transacciones de caja' }, { status: 500 })
  }
}
