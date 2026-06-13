import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const { numero, documentoIdentificacionId } = await req.json()

    if (!numero || !documentoIdentificacionId) {
      return NextResponse.json({ error: 'Número de documento y ID de documento requeridos' }, { status: 400 })
    }

    const doc = await prisma.documentoIdentificacion.findUnique({
      where: { id: documentoIdentificacionId },
      select: { ruta_API: true, abreviatura: true }
    })

    if (!doc) {
      return NextResponse.json({ error: 'Tipo de documento no encontrado' }, { status: 404 })
    }

    if (!doc.ruta_API) {
      return NextResponse.json({ error: 'Ruta API no configurada para este tipo de documento' }, { status: 400 })
    }

    const baseUrl = doc.ruta_API.endsWith('/') ? doc.ruta_API : `${doc.ruta_API}/`
    const apiUrl = `${baseUrl}${numero}`

    const token = process.env.TOKEN_FACTILIZA
    if (!token) {
      return NextResponse.json({ error: 'Token de Factiliza no configurado' }, { status: 500 })
    }

    const externalRes = await fetch(apiUrl, {
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
      }
    })

    if (!externalRes.ok) {
      const errorText = await externalRes.text()
      console.error(`[Factiliza API] Error ${externalRes.status}: ${errorText}`)
      return NextResponse.json({ error: 'Error al consultar servicio externo' }, { status: externalRes.status })
    }

    const data = await externalRes.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[Factiliza API] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
