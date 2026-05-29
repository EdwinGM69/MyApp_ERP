'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/useAuth'
import { useSucursal } from '@/contexts/SucursalContext'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------
interface OpcionMenuAPI {
  id: number
  parent_id: number | null
  descripcion: string
  ruta: string | null
  orden: number
  icono: string | null
}

interface MenuNode extends OpcionMenuAPI {
  children: MenuNode[]
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Construye árbol jerárquico a partir de lista plana ordenada por `orden` */
function buildTree(items: OpcionMenuAPI[]): MenuNode[] {
  const map = new Map<number, MenuNode>()
  const roots: MenuNode[] = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parent_id === null) {
      roots.push(node)
    } else {
      const parent = map.get(item.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // Si el padre no está (filtrado por permisos), lo ponemos como raíz
        roots.push(node)
      }
    }
  })

  return roots
}

/** Íconos por defecto basados en palabras clave de la ruta/descripción */
function inferIcon(node: MenuNode): string {
  if (node.icono) return node.icono
  const desc = node.descripcion.toLowerCase()
  const ruta = (node.ruta ?? '').toLowerCase()

  // ── Operaciones / transacciones específicas (nivel hoja) ─────────────────
  // Se verifican ANTES de los módulos para evitar que keywords del padre
  // (ej: 'ventas' en "Registro de Ventas") capturen a todos los hijos.
  /*
  if (desc.includes('factura') || ruta.includes('factura')) return 'receipt'
  if (desc.includes('cotizaci') || ruta.includes('cotizaci')) return 'request_quote'
  if (desc.includes('pedido') || ruta.includes('pedido')) return 'shopping_bag'
  if ((desc.includes('orden') && desc.includes('compra')) || ruta.includes('orden-compra') || ruta.includes('orden_compra')) return 'order_approve'
  if (desc.includes('devoluci') || ruta.includes('devoluci')) return 'assignment_return'
  if (desc.includes('nota de cr') || desc.includes('nota cr')) return 'note_alt'
  if (desc.includes('nota de d') || desc.includes('nota de déb')) return 'note_alt'
  if (desc.includes('remision') || desc.includes('remisión') || ruta.includes('remision')) return 'local_shipping'
  if (desc.includes('guia') || desc.includes('guía') || ruta.includes('guia')) return 'receipt_long'
  if (desc.includes('kardex') || ruta.includes('kardex')) return 'table_chart'
  if (desc.includes('traslado') || ruta.includes('traslado')) return 'swap_horiz'
  if (desc.includes('ajuste') || ruta.includes('ajuste')) return 'tune'
  if (desc.includes('ingreso') || ruta.includes('ingreso')) return 'input'
  if (desc.includes('egreso') || ruta.includes('egreso')) return 'output'
  if (desc.includes('movimiento') || ruta.includes('movimiento')) return 'sync_alt'
  if (desc.includes('existencia') || ruta.includes('existencia')) return 'inventory'
  if (desc.includes('precio') || ruta.includes('precio')) return 'sell'
  if (desc.includes('conteo') || desc.includes('toma fisica') || ruta.includes('conteo')) return 'fact_check'
  if (desc.includes('arqueo') || ruta.includes('arqueo')) return 'point_of_sale'
  if (desc.includes('apertura') || ruta.includes('apertura')) return 'lock_open'
  if (desc.includes('cierre') || ruta.includes('cierre')) return 'lock'
  if (desc.includes('cobro') || ruta.includes('cobro')) return 'attach_money'
  if (desc.includes('abono') || ruta.includes('abono')) return 'payments'
  if (desc.includes('anticipo') || ruta.includes('anticipo')) return 'savings'
  if (desc.includes('transferencia') || ruta.includes('transferencia')) return 'swap_horiz'
  if (desc.includes('conciliaci') || ruta.includes('conciliaci')) return 'compare'
  if (desc.includes('anular') || desc.includes('cancelar')) return 'cancel'
  if (desc.includes('reversar') || desc.includes('revertir')) return 'undo'
  if (desc.includes('imprimir') || desc.includes('impresi')) return 'print'
  if (desc.includes('exportar') || ruta.includes('export')) return 'file_download'
  if (desc.includes('importar') || ruta.includes('import')) return 'file_upload'
  if (desc.includes('historial') || ruta.includes('historial')) return 'history'
  if (desc.includes('resumen') || ruta.includes('resumen')) return 'summarize'
  if (desc.includes('registro') || ruta.includes('registro')) return 'edit_note'
  if (desc.includes('listado') || ruta.includes('listado')) return 'format_list_bulleted'
  if (desc.includes('detalle') || ruta.includes('detalle')) return 'receipt_long'
  if (desc.includes('correlativo') || ruta.includes('correlativo')) return 'tag'
  if (desc.includes('parámetros') || ruta.includes('parámetros')) return 'settings'
*/
  // ── Módulos / secciones (nivel padre) ────────────────────────────────────
  if (desc.includes('tablero') || desc.includes('dashboard')) return 'dashboard'
  if (desc.includes('punto de venta') || desc.includes('pos')) return 'shopping_cart'
  if (desc.includes('ventas') || desc.includes('venta')) return 'description'
  if (desc.includes('compras') || desc.includes('compra')) return 'shopping_cart'
  if (desc.includes('caja')) return 'account_balance_wallet'
  if (desc.includes('inventario') || desc.includes('almacen')) return 'inventory_2'
  if (desc.includes('reporte')) return 'bar_chart'
  if (desc.includes('cliente')) return 'group'
  if (desc.includes('proveedor')) return 'local_shipping'
  if (desc.includes('material')) return 'category'
  if (desc.includes('marca')) return 'branding_watermark'
  if (desc.includes('categor')) return 'category'
  if (desc.includes('unidad')) return 'straighten'
  if (desc.includes('ubicacion') || desc.includes('ubicación')) return 'location_on'
  if (desc.includes('almac')) return 'warehouse'
  if (desc.includes('valoraci')) return 'payments'
  if (desc.includes('moneda')) return 'paid'
  if (desc.includes('banco')) return 'account_balance'
  if (desc.includes('cambio')) return 'currency_exchange'
  if (desc.includes('medio') && desc.includes('pago')) return 'credit_card'
  if (desc.includes('cup')) return 'confirmation_number'
  if (desc.includes('descuento')) return 'discount'
  if (desc.includes('promoci')) return 'campaign'
  if (desc.includes('esquema')) return 'architecture'
  if (desc.includes('empresa')) return 'settings_applications'
  if (desc.includes('sucursal')) return 'store'
  if (desc.includes('usuario')) return 'manage_accounts'
  if (desc.includes('rol') || desc.includes('permiso')) return 'admin_panel_settings'
  if (desc.includes('parámetros')) return 'settings'
  if (desc.includes('industria')) return 'factory'
  if (desc.includes('país') || desc.includes('pais')) return 'public'
  if (desc.includes('documento')) return 'badge'
  if (desc.includes('correlativos')) return 'tag'
  if (desc.includes('condici')) return 'rule'
  if (desc.includes('clase') && desc.includes('pedido')) return 'description'
  if (desc.includes('tipo') && desc.includes('operaci')) return 'list_alt'
  if (desc.includes('stock')) return 'rule'
  return 'chevron_right'
}

// ------------------------------------------------------------------
// Sub-componentes de renderizado
// ------------------------------------------------------------------

interface NavLinkProps {
  href: string
  icon: string
  label: string
  depth?: number
  isActive: (href: string) => boolean
}

function NavLink({ href, icon, label, depth = 0, isActive }: NavLinkProps) {
  const active = isActive(href)
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-colors text-sm font-medium',
        depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2',
        active
          ? depth === 0
            ? 'bg-primary text-white'
            : 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-slate-800 hover:text-white text-slate-400'
      )}
    >
      <span className={cn('material-symbols-outlined', depth === 0 ? 'text-xl' : 'text-lg')}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

interface CollapsibleMenuProps {
  node: MenuNode
  depth: number
  openMap: Record<string, boolean>
  toggleOpen: (key: string) => void
  isActive: (href: string) => boolean
}

function CollapsibleMenu({ node, depth, openMap, toggleOpen, isActive }: CollapsibleMenuProps) {
  const key = `node-${node.id}`
  const open = openMap[key] ?? false
  const icon = inferIcon(node)

  if (node.children.length === 0) {
    // Hoja con ruta
    if (node.ruta) {
      return (
        <NavLink href={node.ruta} icon={icon} label={node.descripcion} depth={depth} isActive={isActive} />
      )
    }
    // Etiqueta sin hijos ni ruta (raro, pero lo mostramos como sección)
    return (
      <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">
        {node.descripcion}
      </p>
    )
  }

  // Nodo con children: si parent_id == null y ruta == null → etiqueta de sección
  if (node.parent_id === null && node.ruta === null) {
    return (
      <div className="pt-3">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          {node.descripcion}
        </p>
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <CollapsibleMenu
              key={child.id}
              node={child}
              depth={depth}
              openMap={openMap}
              toggleOpen={toggleOpen}
              isActive={isActive}
            />
          ))}
        </div>
      </div>
    )
  }

  // Nodo agrupador colapsable (tiene hijos pero no es raíz de sección)
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => toggleOpen(key)}
        className={cn(
          'w-full flex items-center justify-between px-3 rounded-lg transition-colors text-sm font-medium',
          depth === 0 ? 'py-2.5' : 'py-2',
          open ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'material-symbols-outlined transition-colors',
              depth === 0 ? 'text-xl' : 'text-lg',
              open ? 'text-primary' : 'text-slate-400'
            )}
          >
            {icon}
          </span>
          {node.descripcion}
        </div>
        <span
          className={cn(
            'material-symbols-outlined text-base transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 ml-[22px] pl-4 border-l border-slate-700/60">
          {node.children.map((child) => (
            <CollapsibleMenu
              key={child.id}
              node={child}
              depth={depth + 1}
              openMap={openMap}
              toggleOpen={toggleOpen}
              isActive={isActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Componente principal Sidebar
// ------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [menuTree, setMenuTree] = useState<MenuNode[]>([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)
  const { currentSucursal, hasSucursales } = useSucursal()

  // ---- Cargar menú desde API ----
  useEffect(() => {
    setMounted(true)

    async function fetchMenu() {
      try {
        const res = await apiFetch('/api/menu')
        if (!res.ok) return
        const data = await res.json()
        const items: OpcionMenuAPI[] = data.menu ?? []
        const tree = buildTree(items)
        setMenuTree(tree)

        // Auto-expandir nodos que contienen la ruta activa
        const initialOpen: Record<string, boolean> = {}
        const autoExpand = (nodes: MenuNode[]) => {
          nodes.forEach((node) => {
            if (node.children.length > 0) {
              const hasActive = (ns: MenuNode[]): boolean =>
                ns.some(
                  (n) =>
                    (n.ruta && pathname.startsWith(n.ruta)) ||
                    (n.children.length > 0 && hasActive(n.children))
                )
              initialOpen[`node-${node.id}`] = hasActive(node.children)
              autoExpand(node.children)
            }
          })
        }
        autoExpand(tree)
        setOpenMap(initialOpen)
      } catch {
        // Silencioso — el sidebar simplemente no muestra ítems
      } finally {
        setLoadingMenu(false)
      }
    }

    fetchMenu()
  }, [pathname])

  const toggleOpen = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function isActive(href: string) {
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      // Evitar falsos positivos: que no haya una coincidencia más específica
      const allRoutes = collectRoutes(menuTree)
      const betterMatch = allRoutes.find(
        (r) => r !== href && pathname.startsWith(r) && r.length > href.length
      )
      return !betterMatch
    }
    return false
  }

  function collectRoutes(nodes: MenuNode[]): string[] {
    const routes: string[] = []
    nodes.forEach((n) => {
      if (n.ruta) routes.push(n.ruta)
      routes.push(...collectRoutes(n.children))
    })
    return routes
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-primary rounded-lg size-10 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined text-xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-base font-bold leading-none">KAMAQ ONE</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            {mounted ? (user?.empresa || 'Administración General') : ''}
          </p>
          {mounted && hasSucursales && currentSucursal && (
            <p className="text-slate-400 text-xs font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">business</span>
              {currentSucursal.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loadingMenu ? (
          // Skeleton de carga
          <div className="space-y-2 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-lg bg-slate-800/60 animate-pulse"
                style={{ width: `${70 + (i % 3) * 10}%` }}
              />
            ))}
          </div>
        ) : menuTree.length === 0 ? (
          <p className="px-3 py-4 text-xs text-slate-500 text-center">
            Sin opciones de menú disponibles.
          </p>
        ) : (
          menuTree.map((node) => (
            <CollapsibleMenu
              key={node.id}
              node={node}
              depth={0}
              openMap={openMap}
              toggleOpen={toggleOpen}
              isActive={isActive}
            />
          ))
        )}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="flex items-start gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-xl shrink-0">schedule</span>
            <p className="text-[11px] text-slate-300 leading-tight">
              Tu prueba del plan Premium vence en 14 días.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-[10px] font-bold bg-primary text-white py-1.5 rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-tight">
              Actualizar Ahora
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 text-[10px] font-bold bg-slate-700 text-white py-1.5 rounded-lg hover:bg-slate-600 transition-colors uppercase tracking-tight"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
