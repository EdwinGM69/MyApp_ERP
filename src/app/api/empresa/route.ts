import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  nif: z.string().min(1, 'El NIT/Tax ID es requerido'),
  industria: z.string().optional().nullable(),
  representante: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion_fiscal: z.string().optional().nullable(),
  sitio_web: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  moneda_default: z.string().default('USD'),
  zona_horaria: z.string().default('UTC'),
  logo_url: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
    })

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    // Lookup moneda_id for moneda_default abbreviation
    const moneda = await prisma.moneda.findFirst({
      where: { 
        empresa_id: empresaId,
        abreviatura: empresa.moneda_default
      }
    })

    return NextResponse.json({
      ...empresa,
      moneda_id: moneda?.id,
      moneda_simbolo: moneda?.simbolo || '$'
    })
  } catch (err: any) {
    console.error('Error fetching empresa:', err)
    return NextResponse.json({ error: 'Error al obtener datos de la empresa' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { empresaId, userId } = await requireAuth(req)
    const body = await req.json()
    
    // Validate data
    const validatedData = empresaSchema.parse(body)

    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...validatedData,
        updated_by: userId,
      },
    })

    return NextResponse.json(empresa)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    console.error('Error updating empresa:', err)
    return NextResponse.json({ error: 'Error al actualizar datos de la empresa' }, { status: 500 })
  }
}
