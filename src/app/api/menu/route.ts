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
          select: { rol_id: true }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Unificar todos los rol_id del usuario
    const rolIds = Array.from(
      new Set([
        usuario.rol_id,
        ...usuario.roles_adicionales.map((r) => r.rol_id)
      ])
    )

    // 2. Obtener los opcion_menu_id a los que tiene acceso (visualizar = true)
    const permisos = await prisma.permisos.findMany({
      where: {
        rol_id: { in: rolIds },
        visualizar: true,
      },
      select: { opcion_menu_id: true }
    })

    const opcionesPermitidas = new Set(permisos.map((p) => p.opcion_menu_id))

    // 3. Traer todas las opciones de menú activas, ordenadas por `orden`
    const opcionesMenu = await prisma.opcionMenu.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        parent_id: true,
        descripcion: true,
        ruta: true,
        orden: true,
        modulo: {
          select: { icono: true }
        }
      }
    })

    // 4. Filtrar las opciones permitidas.
    //    Una opción padre (sin ruta, etiqueta de sección) se muestra si tiene al menos
    //    un hijo visible. Las opciones con ruta se muestran si tienen permiso.
    const filtrarOpciones = (items: typeof opcionesMenu): typeof opcionesMenu => {
      // Primero, construir set de ids con acceso directo (tienen permiso)
      const idConPermiso = new Set(
        items
          .filter(
            (o) =>
              o.ruta !== null && opcionesPermitidas.has(o.id)
          )
          .map((o) => o.id)
      )

      // Función recursiva para verificar si un nodo padre tiene algún descendiente permitido
      const tieneDescendientePermitido = (parentId: number): boolean => {
        const hijos = items.filter((o) => o.parent_id === parentId)
        return hijos.some(
          (h) =>
            idConPermiso.has(h.id) ||
            (h.ruta === null && tieneDescendientePermitido(h.id))
        )
      }

      return items.filter((o) => {
        if (o.parent_id === null && o.ruta === null) {
          // Etiqueta raíz de sección → visible si tiene descendientes permitidos
          return tieneDescendientePermitido(o.id)
        }
        if (o.ruta === null) {
          // Nodo agrupador intermedio → visible si tiene descendientes permitidos
          return tieneDescendientePermitido(o.id)
        }
        // Opción con ruta → visible si tiene permiso
        return idConPermiso.has(o.id)
      })
    }

    const opcionesFiltradas = filtrarOpciones(opcionesMenu)

    // Serializar eliminando campos internos innecesarios
    const result = opcionesFiltradas.map((o) => ({
      id: o.id,
      parent_id: o.parent_id,
      descripcion: o.descripcion,
      ruta: o.ruta,
      orden: o.orden,
      icono: o.modulo?.icono ?? null,
    }))

    return NextResponse.json({ menu: result })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('[API/MENU] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
