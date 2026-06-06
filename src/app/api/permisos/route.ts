import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const permisoItemSchema = z.object({
  opcion_menu_id: z.number().int().positive(),
  visualizar: z.boolean(),
  crear: z.boolean(),
  editar: z.boolean(),
  borrar: z.boolean(),
  exportar: z.boolean(),
  importar: z.boolean(),
  abrir_cerrar_caja: z.boolean(),
})

const bulkPermisosSchema = z.object({
  rol_id: z.number().int().positive(),
  permisos: z.array(permisoItemSchema),
})

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = req.nextUrl
    const rolId = searchParams.get('rol_id')

    if (!rolId) {
      return NextResponse.json({ error: 'rol_id es requerido' }, { status: 400 })
    }

    const permisos = await prisma.permisos.findMany({
      where: { rol_id: parseInt(rolId) }
    })

    return NextResponse.json({ data: permisos })
  } catch (err) {
    console.error('[API/PERMISOS] Error:', err)
    return NextResponse.json({ error: 'Error al obtener permisos' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const data = bulkPermisosSchema.parse(body)

    await prisma.permisos.deleteMany({
      where: { rol_id: data.rol_id }
    })

    if (data.permisos.length > 0) {
      await prisma.permisos.createMany({
        data: data.permisos.map(p => ({
          rol_id: data.rol_id,
          opcion_menu_id: p.opcion_menu_id,
          visualizar: p.visualizar,
          crear: p.crear,
          editar: p.editar,
          borrar: p.borrar,
          exportar: p.exportar,
          importar: p.importar,
          abrir_cerrar_caja: p.abrir_cerrar_caja,
        }))
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }
    console.error('[API/PERMISOS] Error:', err)
    return NextResponse.json({ error: 'Error al guardar permisos' }, { status: 500 })
  }
}
