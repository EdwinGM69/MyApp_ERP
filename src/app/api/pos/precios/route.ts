import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getParametroPrecioVenta(empresaId: number, userId: number): Promise<string | null> {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        p.tipo_dato,
        p.nivel,
        p.valor_string,
        CASE p.tipo_dato
          WHEN 'STRING' THEN p.valor_string
          WHEN 'NUMBER' THEN p.valor_number::TEXT
          WHEN 'BOOLEAN' THEN p.valor_boolean::TEXT
          WHEN 'DATE' THEN p.valor_date::TEXT
          WHEN 'JSON' THEN p.valor_json::TEXT
          ELSE COALESCE(p.valor_string, p.valor_number::TEXT)
        END AS valor
      FROM "ParametroSistema" p
      WHERE
        p.codigo = 'POS.PREVTA'
        AND p.activo = true
        AND (
          (p.nivel = 'USUARIO' AND p.empresa_id = $1 AND p.created_by = $2)
          OR (p.nivel = 'EMPRESA' AND (p.empresa_id = $1 OR p.empresa_id IS NULL))
          OR (p.nivel = 'MODULO' AND p.empresa_id IS NULL)
          OR (p.nivel = 'SISTEMA' AND p.empresa_id IS NULL)
        )
      ORDER BY
        CASE p.nivel
          WHEN 'USUARIO' THEN 1
          WHEN 'EMPRESA' THEN 2
          WHEN 'MODULO' THEN 3
          WHEN 'SISTEMA' THEN 4
        END
      LIMIT 1
    `, empresaId, userId)
    console.log('[POS] Parametro query result:', result)
    if (!result || result.length === 0) {
      console.log('[POS] No parametro found for POS.PREVTA')
      return null
    }
    return result[0]?.valor ?? null
  } catch (e) {
    console.error('[POS] Error getting parametro precio venta:', e)
    return null
  }
}

async function getDynamicPrice(
  empresaId: number,
  materialId: number,
  monedaId: number,
  tipoCondicionCodigo: string
): Promise<number | null> {
  try {
    console.log('[POS] getDynamicPrice params:', { empresaId, materialId, monedaId, tipoCondicionCodigo })
    
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.material_id, c.valor, tc.codigo as tipo_codigo
      FROM "Condicion" c
      JOIN "TipoCondicion" tc ON tc.id = c.tipo_condicion_id
      WHERE tc.empresa_id = $1
        AND tc.codigo = $2
        AND c.moneda_id = $3
        AND c.activo = true
        AND c.fecha_desde <= NOW()
        AND (c.fecha_hasta IS NULL OR c.fecha_hasta >= NOW())
        AND c.material_id = $4
      ORDER BY c.fecha_desde DESC
      LIMIT 1
    `, empresaId, tipoCondicionCodigo, monedaId, materialId)
    
    console.log('[POS] Raw query result:', result)
    
    if (!result[0]?.valor) return null
    
    const valor = result[0].valor
    if (typeof valor === 'number') return valor
    if (typeof valor === 'string') return parseFloat(valor)
    return Number(valor)
  } catch (e) {
    console.error('[POS] Error getting dynamic price:', e)
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const { searchParams } = req.nextUrl

    const materialIdsParam = searchParams.get('materialIds') ?? ''
    const materialIds = materialIdsParam.split(',').filter(Boolean).map(Number).filter(n => !isNaN(n))

    console.log('[POS] GET /api/pos/precios empresaId:', empresaId, 'userId:', userId, 'materialIds:', materialIds)

    if (materialIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const paramCodigo = await getParametroPrecioVenta(empresaId, userId)
    console.log('[POS] paramCodigo from POS.PREVTA:', paramCodigo)
    if (!paramCodigo) {
      console.log('[POS] No parametro found, returning empty')
      return NextResponse.json({ data: [] })
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { moneda_default: true }
    })
    console.log('[POS] empresa moneda_default:', empresa?.moneda_default)
    if (!empresa || !empresa.moneda_default) {
      return NextResponse.json({ error: 'Empresa sin moneda_default' }, { status: 400 })
    }

    const defaultMoneda = await prisma.moneda.findFirst({
      where: { empresa_id: empresaId, abreviatura: empresa.moneda_default },
      select: { id: true, abreviatura: true }
    })
    console.log('[POS] defaultMoneda:', defaultMoneda)
    if (!defaultMoneda) {
      return NextResponse.json({ error: 'Moneda default no configurada' }, { status: 400 })
    }

    const results: { materialId: number; precio: number }[] = []
    for (const matId of materialIds) {
      console.log('[POS] Fetching price for materialId:', matId, 'monedaId:', defaultMoneda.id, 'tipoCondicion:', paramCodigo)
      const dynamicPrice = await getDynamicPrice(empresaId, matId, defaultMoneda.id, paramCodigo)
      console.log('[POS] Result for material:', matId, 'dynamicPrice:', dynamicPrice)
      if (dynamicPrice !== null) {
        results.push({ materialId: matId, precio: dynamicPrice })
      }
    }

    console.log('[POS] Final results:', results)
    return NextResponse.json({ data: results })
  } catch (e) {
    console.error('[POS] Error in precios API:', e)
    return NextResponse.json({ error: 'Error al obtener precios' }, { status: 500 })
  }
}