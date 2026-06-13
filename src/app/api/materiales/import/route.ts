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
  moneda_costo_promedio_id: z.coerce.number().optional().nullable(),
  moneda_precio_compra_id: z.coerce.number().optional().nullable(),
  imagen_url: z.string().optional().nullable(),
  nivel_rotacion: z.string().optional().nullable(),
  perecible: z.boolean().optional(),
  compuesto: z.boolean().optional(),
  marca_id: z.coerce.number().optional().nullable(),
  categoria_id: z.coerce.number().optional().nullable(),
  tipo_id: z.coerce.number().optional().nullable(),
  unidad_medida_id: z.coerce.number().optional().nullable(),
  esquema_id: z.coerce.number().optional().nullable(),
  stock_lote: z.boolean().optional(),
  ubicacion_default_id: z.coerce.number().optional().nullable(),
})

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

        await prisma.material.create({
          data: {
            ...parsed,
            empresa_id: empresaId,
            created_by: userId,
          },
        })

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
