import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pais = await prisma.pais.create({
      data: {
        descripcion: body.descripcion,
        abreviatura: body.abreviatura,
        prefijo_telefonico: body.prefijo_telefonico,
        activo: true,
        empresa_id: 1, // hardcode for test
        created_by: 1
      }
    })
    return NextResponse.json(pais)
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
