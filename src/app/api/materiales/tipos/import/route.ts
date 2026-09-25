import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const importRowSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  activo: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()

    if (!body.tipos || !Array.isArray(body.tipos)) {
      return NextResponse.json({ error: 'Se requiere un array "tipos".' }, { status: 400 })
    }

    const results: { created: number; errors: { row: number; codigo: string; descripcion: string; error: string }[] } = {
      created: 0,
      errors: [],
    }

    for (let i = 0; i < body.tipos.length; i++) {
      const row = body.tipos[i]
      const rowNumber = i + 1

      try {
        const parsed = importRowSchema.parse(row)

        const existente = await prisma.materialTipo.findFirst({
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
            ? `Ya existe un tipo de material con el código "${parsed.codigo}".`
            : `Ya existe un tipo de material con la descripción "${parsed.descripcion}".`
          results.errors.push({ row: rowNumber, codigo: parsed.codigo, descripcion: parsed.descripcion, error: razon })
          continue
        }

        await prisma.materialTipo.create({
          data: {
            codigo: parsed.codigo,
            descripcion: parsed.descripcion,
            activo: parsed.activo ?? true,
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