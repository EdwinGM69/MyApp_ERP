import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req) // We might just need the token validation
    
    // For roles we don't necessarily filter by empresa_id since roles might be global or specific
    // Looking at the schema, Rol does NOT have empresa_id. It's a global table.
    const roles = await prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ data: roles })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}
