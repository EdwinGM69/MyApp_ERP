import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const importRowSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  codigo_barras: z.string().optional().nullable(),
  stock_minimo: z.coerce.number().min(0).optional(),
  stock_maximo: z.coerce.number().min(0).optional().nullable(),
  costo_promedio: z.coerce.number().min(0).optional().nullable(),
  moneda_costo_promedio_id: z.union([z.string(), z.number()]).optional().nullable(),
  moneda_precio_compra_id: z.union([z.string(), z.number()]).optional().nullable(),
  imagen_url: z.string().optional().nullable(),
  nivel_rotacion: z.string().optional().nullable(),
  perecible: z.boolean().optional(),
  compuesto: z.boolean().optional(),
  marca_id: z.coerce.number().optional().nullable(),
  categoria_id: z.coerce.number().optional().nullable(),
  tipo_id: z.coerce.number().optional().nullable(),
  unidad_medida_id: z.union([z.string(), z.number()]).optional().nullable(),
  esquema_id: z.coerce.number().optional().nullable(),
  stock_lote: z.boolean().optional(),
  ubicacion: z.union([z.string(), z.number()]).optional().nullable(),
  ubicacion_default_id: z.union([z.string(), z.number()]).optional().nullable(),
})

// Interpreta un valor del Excel como ID numérico o abreviatura
function parseIdOrAbbreviation(val: unknown): { tipo: 'id'; id: number } | { tipo: 'abreviatura'; abreviatura: string } | null {
  if (val === undefined || val === null) return null
  const str = String(val).trim()
  if (!str) return null
  if (/^\d+$/.test(str)) {
    return { tipo: 'id', id: Number(str) }
  }
  return { tipo: 'abreviatura', abreviatura: str }
}

async function resolveMonedaId(val: unknown): Promise<number | null> {
  const parsed = parseIdOrAbbreviation(val)
  if (!parsed) return null
  if (parsed.tipo === 'id') return parsed.id
  const moneda = await prisma.moneda.findFirst({
    where: { abreviatura: { equals: parsed.abreviatura, mode: 'insensitive' as const } },
  })
  return moneda?.id ?? null
}

async function resolveUnidadMedidaId(val: unknown): Promise<number | null> {
  const parsed = parseIdOrAbbreviation(val)
  if (!parsed) return null
  if (parsed.tipo === 'id') return parsed.id
  const unidad = await prisma.unidadMedida.findFirst({
    where: { abreviatura: { equals: parsed.abreviatura, mode: 'insensitive' as const } },
  })
  return unidad?.id ?? null
}

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    if (!body.materiales || !Array.isArray(body.materiales)) {
      return NextResponse.json({ error: 'Se requiere un array "materiales".' }, { status: 400 })
    }

    const results: { created: number; errors: { row: number; codigo: string; descripcion: string; error: string }[] } = {
      created: 0,
      errors: [],
    }

    for (let i = 0; i < body.materiales.length; i++) {
      const row = body.materiales[i]
      const rowNumber = i + 1

      try {
        const parsed = importRowSchema.parse(row)

        const existente = await prisma.material.findFirst({
          where: {
            empresa_id: empresaId,
            OR: [
              { codigo: { equals: parsed.codigo, mode: 'insensitive' as const } },
              { descripcion: { equals: parsed.descripcion, mode: 'insensitive' as const } },
            ],
          },
        })

        if (existente) {
          const razon = existente.codigo?.toLowerCase() === parsed.codigo.toLowerCase()
            ? `Ya existe un material con el código "${parsed.codigo}".`
            : `Ya existe un material con la descripción "${parsed.descripcion}".`
          results.errors.push({ row: rowNumber, codigo: parsed.codigo, descripcion: parsed.descripcion, error: razon })
          continue
        }
        /*
                await prisma.material.create({
                  data: {
                    ...parsed,
                    empresa_id: empresaId,
                    created_by: userId,
                  },
                })
        */

        const {
          ubicacion: ubicacionCodigo,
          ubicacion_default_id: ubicacionDefault,
          moneda_costo_promedio_id,
          moneda_precio_compra_id,
          unidad_medida_id,
          ...materialData
        } = parsed

        const ubicacionRef = ubicacionCodigo ?? ubicacionDefault
        let ubicacionDefaultId: number | null = null

        if (ubicacionRef !== undefined && ubicacionRef !== null && String(ubicacionRef).trim() !== '') {
          const ubicacion = await prisma.ubicacion.findFirst({
            where: {
              empresa_id: empresaId,
              ...(typeof ubicacionRef === 'number'
                ? { id: ubicacionRef }
                : { codigo: { equals: String(ubicacionRef).trim(), mode: 'insensitive' as const } }),
            },
          })

          if (!ubicacion) {
            results.errors.push({
              row: rowNumber,
              codigo: parsed.codigo,
              descripcion: parsed.descripcion,
              error: `La ubicación "${String(ubicacionRef).trim()}" no existe para la empresa.`,
            })
            continue
          }

          ubicacionDefaultId = ubicacion.id
        }

        let monedaCostoPromedioId: number | null = null
        if (moneda_costo_promedio_id !== undefined && moneda_costo_promedio_id !== null) {
          monedaCostoPromedioId = await resolveMonedaId(moneda_costo_promedio_id)
          if (monedaCostoPromedioId === null) {
            results.errors.push({
              row: rowNumber,
              codigo: parsed.codigo,
              descripcion: parsed.descripcion,
              error: `La moneda "${String(moneda_costo_promedio_id).trim()}" no existe en el catálogo de monedas.`,
            })
            continue
          }
        }

        let monedaPrecioCompraId: number | null = null
        if (moneda_precio_compra_id !== undefined && moneda_precio_compra_id !== null) {
          monedaPrecioCompraId = await resolveMonedaId(moneda_precio_compra_id)
          if (monedaPrecioCompraId === null) {
            results.errors.push({
              row: rowNumber,
              codigo: parsed.codigo,
              descripcion: parsed.descripcion,
              error: `La moneda "${String(moneda_precio_compra_id).trim()}" no existe en el catálogo de monedas.`,
            })
            continue
          }
        }

        let unidadMedidaId: number | null = null
        if (unidad_medida_id !== undefined && unidad_medida_id !== null) {
          unidadMedidaId = await resolveUnidadMedidaId(unidad_medida_id)
          if (unidadMedidaId === null) {
            results.errors.push({
              row: rowNumber,
              codigo: parsed.codigo,
              descripcion: parsed.descripcion,
              error: `La unidad de medida "${String(unidad_medida_id).trim()}" no existe en el catálogo de unidades.`,
            })
            continue
          }
        }

        const materialCreado = await prisma.material.create({
          data: {
            ...materialData,
            moneda_costo_promedio_id: monedaCostoPromedioId,
            moneda_precio_compra_id: monedaPrecioCompraId,
            unidad_medida_id: unidadMedidaId,
            ubicacion_default_id: ubicacionDefaultId,
            empresa_id: empresaId,
            created_by: userId
          }
        })

        if (unidadMedidaId) {
          await prisma.materialPresentacion.create({
            data: {
              material_id: materialCreado.id,
              unidad_medida_id: unidadMedidaId,
              unidad_control: true,
              activo: true,
              created_by: userId
            }
          })
        }

        results.created++
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          const issues = err.issues.map((iss: any) => `${iss.path.join('.')}: ${iss.message}`).join('; ')
          results.errors.push({ row: rowNumber, codigo: row.codigo || '', descripcion: row.descripcion || '', error: issues })
        } else {
          results.errors.push({ row: rowNumber, codigo: row.codigo || '', descripcion: row.descripcion || '', error: err.message || 'Error desconocido' })
        }
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: `Error en importación: ${err.message}` }, { status: 500 })
  }
}
