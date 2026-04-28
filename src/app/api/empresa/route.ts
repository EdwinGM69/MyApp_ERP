import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  nif: z.string().min(1, 'El NIT/Tax ID es requerido'),
  industria_id: z.number().optional().nullable(),
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
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50')

    // Si hay parámetros de búsqueda, devolver lista de empresas
    if (search || pageSize !== 50 || page !== 1) {
      const where = search ? {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' as const } },
          { nif: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}

      const [total, empresas] = await Promise.all([
        prisma.empresa.count({ where }),
        prisma.empresa.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { nombre: 'asc' },
          select: { id: true, nombre: true, nif: true }
        })
      ])

      return NextResponse.json({ 
        data: empresas, 
        total, 
        page, 
        pageSize, 
        totalPages: Math.ceil(total / pageSize) 
      })
    }

    // Comportamiento original: devolver empresa del usuario
    const { empresaId } = await requireAuth(req)

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        industria: true,
      }
    })

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    // Lookup moneda_id for moneda_default abbreviation
    let moneda = null
    if (empresaId && empresa.moneda_default) {
      moneda = await prisma.moneda.findFirst({
        where: { 
          empresa_id: empresaId,
          abreviatura: empresa.moneda_default
        }
      })
    }

    return NextResponse.json({
      ...empresa,
      industria_id: empresa.industria_id || null,
      moneda_id: moneda?.id || null,
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
    const { industria_id, ...restData } = empresaSchema.parse(body)

    // Build update data
    const updateData: any = {
      ...restData,
      updated_by: userId,
    }

    // Handle industria relation
    if (industria_id) {
      updateData.industria = { connect: { id: industria_id } }
    } else {
      updateData.industria = { disconnect: true }
    }

    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: updateData,
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
