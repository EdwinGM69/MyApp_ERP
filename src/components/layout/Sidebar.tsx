'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/useAuth'
import { useSucursal } from '@/contexts/SucursalContext'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Tablero' },
  { href: '/ventas', icon: 'description', label: 'Ventas' },
  { href: '/ventas/pos', icon: 'shopping_cart', label: 'Punto de Venta' },
  { href: '/gestion-caja', icon: 'account_balance_wallet', label: 'Gestión de Caja' },
  { href: '/almacen/movimientos', icon: 'inventory_2', label: 'Inventario' },
  { href: '/reportes', icon: 'bar_chart', label: 'Reportes' },
]

const maestrosCategories = [
  {
    label: 'Comercial',
    icon: 'storefront',
    items: [
      { href: '/maestros/clientes', icon: 'group', label: 'Clientes' },
      { href: '/maestros/comercial/condiciones', icon: 'rule', label: 'Condiciones Comerciales' },
      { href: '/precios/cupones', icon: 'confirmation_number', label: 'Cupones' },
      { href: '/precios/promociones', icon: 'campaign', label: 'Promociones' },
      { href: '/maestros/comercial/esquemas-calculo', icon: 'architecture', label: 'Esquemas de Cálculo' },
      { href: '/maestros/comercial/clases-pedido', icon: 'description', label: 'Clase de Pedido' },
    ]
  },
  {
    label: 'Logística',
    icon: 'inventory_2',
    items: [
      { href: '/maestros/logistica/marcas', icon: 'branding_watermark', label: 'Marcas' },
      { href: '/maestros/logistica/categorias', icon: 'category', label: 'Categorías' },
      { href: '/maestros/logistica/tipos-material', icon: 'inventory_2', label: 'Tipos de Material' },
      { href: '/maestros/logistica/unidades', icon: 'straighten', label: 'Unidades de Medida' },
      { href: '/maestros/estados-stock', icon: 'rule', label: 'Estado de Stock' },
      { href: '/maestros/logistica/tipos-operacion', icon: 'list_alt', label: 'Tipos de Operación' },
      { href: '/maestros/ubicaciones', icon: 'location_on', label: 'Ubicaciones' },
      { href: '/maestros/logistica/almacenes', icon: 'warehouse', label: 'Almacenes' },
      { href: '/maestros/logistica/esquemas-valoracion', icon: 'payments', label: 'Esquema de Valoración' },
      { href: '/maestros/proveedores', icon: 'local_shipping', label: 'Proveedores' },
      { href: '/maestros/materiales', icon: 'category', label: 'Materiales' },
    ]
  },
  {
    label: 'Tesorería',
    icon: 'account_balance_wallet',
    items: [
      { href: '/tesoreria/monedas', icon: 'payments', label: 'Monedas' },
      { href: '/tesoreria/bancos', icon: 'account_balance', label: 'Bancos' },
      { href: '/tesoreria/tipo-cambio', icon: 'currency_exchange', label: 'Tipo de Cambio' },
      { href: '/tesoreria/medios-pago', icon: 'payments', label: 'Medios de Pago' },
      { href: '/tesoreria/cajas', icon: 'account_balance_wallet', label: 'Cajas' },
      { href: '/tesoreria/conceptos-caja', icon: 'category', label: 'Concepto Caja' },
    ]
  }
]

const adminItems = [
  { href: '/empresa', icon: 'settings_applications', label: 'Empresa' },
  { href: '/usuarios', icon: 'manage_accounts', label: 'Usuarios' },
  { href: '/maestros/configuracion/parametros-sistema', icon: 'settings', label: 'Parámetros del Sistema' },
  { href: '/logistica/industrias', icon: 'factory', label: 'Industrias' },
  { href: '/logistica/paises', icon: 'public', label: 'Países' },
  { href: '/logistica/documentos-identificacion', icon: 'badge', label: 'Documentos ID' },
]

const bottomItems: any[] = []

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    setMounted(true)
    const initialState: { [key: string]: boolean } = {}
    maestrosCategories.forEach(cat => {
      initialState[cat.label] = cat.items.some(i => pathname.startsWith(i.href))
    })
    setOpenCategories(initialState)
  }, [pathname])

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)
  const { currentSucursal, hasSucursales } = useSucursal()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  function isActive(href: string) {
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      const allItems = [
        ...navItems,
        ...maestrosCategories.flatMap(cat => cat.items)
      ]
      const betterMatch = allItems.find(
        (item) => item.href !== href && pathname.startsWith(item.href) && item.href.length > href.length
      )
      return !betterMatch
    }
    return false
  }

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-primary rounded-lg size-10 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined text-xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-base font-bold leading-none">ERP/POS Pro</h1>
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
        {/* Main nav */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
              isActive(item.href)
                ? 'bg-primary text-white'
                : 'hover:bg-slate-800 hover:text-white text-slate-400'
            )}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Maestros section (Flat categories) */}
        <div className="pt-2">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Maestros
          </p>

          <div className="space-y-1">
            {maestrosCategories.map((category) => (
              <div key={category.label} className="space-y-0.5">
                <button
                  onClick={() => toggleCategory(category.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                    openCategories[category.label] ? "bg-slate-800/50 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "material-symbols-outlined text-xl transition-colors",
                      openCategories[category.label] ? "text-primary" : "text-slate-400"
                    )}>
                      {category.icon}
                    </span>
                    {category.label}
                  </div>
                  {category.items.length > 0 && (
                    <span
                      className={cn(
                        'material-symbols-outlined text-base transition-transform duration-200',
                        openCategories[category.label] ? 'rotate-180' : ''
                      )}
                    >
                      expand_more
                    </span>
                  )}
                </button>

                {openCategories[category.label] && category.items.length > 0 && (
                  <div className="ml-9 mt-0.5 space-y-0.5">
                    {category.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                          isActive(item.href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-slate-800 hover:text-white text-slate-400'
                        )}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Administracion section */}
        <div className="pt-4">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Administración
          </p>
          <div className="space-y-1">
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                )}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom nav items */}
        <div className="pt-2 border-t border-slate-800 mt-2">
          {bottomItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium mt-1',
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
              )}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Premium notice */}
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
            <button className="flex-1 text-[10px] font-bold bg-slate-700 text-white py-1.5 rounded-lg hover:bg-slate-600 transition-colors uppercase tracking-tight">
              Cambiar Plan
            </button>
          </div>
        </div>

      </div>
    </aside>
  )
}
