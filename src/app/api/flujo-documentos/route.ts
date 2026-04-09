import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const flujoDocumentosSchema = z.object({
    referencia_id: z.number().int(),
    tipo_referencia: z.string(),
    referencia_anterior_id: z.number().int(),
    activo: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
    try {
        const { empresaId } = await requireAuth(req)
        const { searchParams } = req.nextUrl

        const id = searchParams.get('id')
        if (id) {
            const flujoDocumentos = await prisma.flujoDocumentos.findFirst({
                where: { id: Number(id), empresa_id: empresaId },
                include: {
                    usuario_creador: { select: { nombre: true } }
                }
            })
            return NextResponse.json({ data: flujoDocumentos })
        }

        const page = parseInt(searchParams.get('page') ?? '1')
        const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
        const search = searchParams.get('search') ?? ''
        console.log(search)
        const where = {
            empresa_id: empresaId,
            ...(search ? { OR: [] } : {}),
        }

        const [total, flujoDocumentos] = await Promise.all([
            prisma.flujoDocumentos.count({ where }),
            prisma.flujoDocumentos.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { created_at: 'asc' },
            }),
        ])

        return NextResponse.json({ data: flujoDocumentos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (err) {
        return NextResponse.json({ error: 'Error al obtener flujoDocumentos' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { empresaId, userId } = await requireAuth(req)
        const body = await req.json()

        const data = flujoDocumentosSchema.parse(body)

        const flujoDocumentos = await prisma.flujoDocumentos.create({
            data: {
                ...data,
                empresa_id: empresaId,
                created_by: userId
            },
        })
        return NextResponse.json(flujoDocumentos, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: 'Error al crear flujoDocumentos' }, { status: 500 })
    }
}