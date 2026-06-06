import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req)

    // 1. Obtener el rol principal y los roles adicionales del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        rol_id: true,
        roles_adicionales: {
          select: { rol_id: true },
        },
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Unificar todos los rol_id (principal + adicionales), eliminar duplicados
    const rolIds = Array.from(
      new Set([
        usuario.rol_id,
        ...usuario.roles_adicionales.map((r) => r.rol_id),
      ])
    )

    // 2. Obtener todos los permisos de esos roles, incluyendo la ruta de la opción de menú
    const permisos = await prisma.permisos.findMany({
      where: {
        rol_id: { in: rolIds },
      },
      select: {
        opcion_menu_id: true,
        visualizar: true,
        crear: true,
        editar: true,
        borrar: true,
        exportar: true,
        importar: true,
        abrir_cerrar_caja: true,
        opcion_menu: {
          select: {
            ruta: true,
          },
        },
      },
    })

    // 3. Combinar permisos por opcion_menu_id usando OR lógico
    //    (si cualquier rol permite una acción, el usuario puede hacerla)
    const combinados = new Map<
      number,
      {
        opcion_menu_id: number
        ruta: string | null
        visualizar: boolean
        crear: boolean
        editar: boolean
        borrar: boolean
        exportar: boolean
        importar: boolean
        abrir_cerrar_caja: boolean
      }
    >()

    for (const p of permisos) {
      const existing = combinados.get(p.opcion_menu_id)
      if (!existing) {
        combinados.set(p.opcion_menu_id, {
          opcion_menu_id: p.opcion_menu_id,
          ruta: p.opcion_menu.ruta,
          visualizar: p.visualizar,
          crear: p.crear,
          editar: p.editar,
          borrar: p.borrar,
          exportar: p.exportar,
          importar: p.importar,
          abrir_cerrar_caja: p.abrir_cerrar_caja,
        })
      } else {
        // OR lógico: si cualquier rol lo permite, queda en true
        existing.visualizar = existing.visualizar || p.visualizar
        existing.crear = existing.crear || p.crear
        existing.editar = existing.editar || p.editar
        existing.borrar = existing.borrar || p.borrar
        existing.exportar = existing.exportar || p.exportar
        existing.importar = existing.importar || p.importar
        existing.abrir_cerrar_caja = existing.abrir_cerrar_caja || p.abrir_cerrar_caja
      }
    }

    return NextResponse.json({ permisos: Array.from(combinados.values()) })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('[API/MIS-PERMISOS] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
