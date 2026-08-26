import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload } from '@/lib/auth'

// Same sample products as prisma/seed.ts
const productosDemo = [
  { codigo: 'MAT-001', descripcion: 'Laptop Dell Inspiron 15', precio_costo: 1200, precio_venta: 1599, stock_actual: 25, stock_minimo: 5 },
  { codigo: 'MAT-002', descripcion: 'Mouse Inalámbrico Logitech', precio_costo: 25, precio_venta: 45, stock_actual: 120, stock_minimo: 20 },
  { codigo: 'MAT-003', descripcion: 'Teclado Mecánico RGB', precio_costo: 80, precio_venta: 129, stock_actual: 45, stock_minimo: 10 },
  { codigo: 'MAT-004', descripcion: 'Monitor 24" Full HD', precio_costo: 200, precio_venta: 299, stock_actual: 30, stock_minimo: 5 },
  { codigo: 'MAT-005', descripcion: 'Auriculares Bluetooth Sony', precio_costo: 60, precio_venta: 99, stock_actual: 80, stock_minimo: 15 },
]

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: check if CSRF token matches
    const csrfToken = req.headers.get('x-csrf-token')
    const csrfCookie = req.cookies.get('csrf_token')?.value

    if (csrfToken && csrfCookie && csrfToken !== csrfCookie) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
    }

    const payload = await getAuthPayload(req)

    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { empresaId, userId } = payload

    console.log('[DEMO-DATA] Loading demo data for empresa:', empresaId)

    // Idempotency guard: avoid duplicating demo data
    const materialesExistentes = await prisma.material.count({
      where: { empresa_id: empresaId },
    })

    if (materialesExistentes > 0) {
      return NextResponse.json(
        { error: 'Tu empresa ya cuenta con datos cargados' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Impuesto IGV (like seed.ts)
      let igv = await tx.impuesto.findFirst({
        where: { empresa_id: empresaId, codigo: 'IGV' },
      })
      if (!igv) {
        igv = await tx.impuesto.create({
          data: {
            empresa_id: empresaId,
            codigo: 'IGV',
            descripcion: 'Impuesto General a las Ventas',
            porcentaje: 18,
            tipo: 'IGV',
            activo: true,
            created_by: userId,
          },
        })
      }

      // Monedas PEN/USD (needed for the open cash session)
      let usd = await tx.moneda.findFirst({
        where: { empresa_id: empresaId, abreviatura: 'USD' },
      })
      if (!usd) {
        usd = await tx.moneda.create({
          data: {
            empresa_id: empresaId,
            descripcion: 'Dólar Americano',
            abreviatura: 'USD',
            simbolo: '$',
            activo: true,
            created_by: userId,
          },
        })
      }

      let pen = await tx.moneda.findFirst({
        where: { empresa_id: empresaId, abreviatura: 'PEN' },
      })
      if (!pen) {
        pen = await tx.moneda.create({
          data: {
            empresa_id: empresaId,
            descripcion: 'Sol Peruano',
            abreviatura: 'PEN',
            simbolo: 'S/',
            activo: true,
            created_by: userId,
          },
        })
      }

      // 5 sample products
      for (const m of productosDemo) {
        await tx.material.create({
          data: {
            empresa_id: empresaId,
            codigo: m.codigo,
            descripcion: m.descripcion,
            precio_costo: m.precio_costo,
            precio_venta: m.precio_venta,
            stock_actual: m.stock_actual,
            stock_minimo: m.stock_minimo,
            impuesto_id: igv.id,
            created_by: userId,
          },
        })
      }

      // Cash register + open session ("caja abierta")
      let caja = await tx.caja.findFirst({
        where: { empresa_id: empresaId, codigo: 'CAJA-01' },
      })
      if (!caja) {
        caja = await tx.caja.create({
          data: {
            empresa_id: empresaId,
            codigo: 'CAJA-01',
            descripcion: 'Caja Principal',
            detalle_denominacion: false,
            activo: true,
            created_by: userId,
          },
        })
      }

      const sucursal = await tx.sucursal.findFirst({
        where: { empresa_id: empresaId, activo: true },
        orderBy: { id: 'asc' },
      })

      if (!sucursal) {
        throw new Error('NO_SUCURSAL')
      }

      await tx.cajaGestion.create({
        data: {
          sucursal_id: sucursal.id,
          caja_id: caja.id,
          moneda_id: usd.id,
          estado: 'Aperturada',
          fecha_apertura: new Date(),
          usuario_apertura_id: userId,
          monto_apertura: 100,
        },
      })
    })

    console.log('[DEMO-DATA] Demo data loaded successfully')

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: any) {
    if (err?.message === 'NO_SUCURSAL') {
      return NextResponse.json(
        { error: 'Debe registrar primero una sucursal' },
        { status: 400 }
      )
    }

    console.error('[DEMO-DATA] Unexpected error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
