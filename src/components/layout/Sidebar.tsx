'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Tablero' },
  { href: '/ventas', icon: 'description', label: 'Ventas' },
  { href: '/ventas/pos', icon: 'shopping_cart', label: 'Punto de Venta' },
  { href: '/caja/transacciones', icon: 'point_of_sale', label: 'Caja' },
  { href: '/almacen/movimientos', icon: 'inventory_2', label: 'Inventario' },
  { href: '/reportes', icon: 'bar_chart', label: 'Reportes' },
]

const maestrosItems = [
  { href: '/maestros/clientes', icon: 'group', label: 'Clientes' },
  { href: '/maestros/proveedores', icon: 'local_shipping', label: 'Proveedores' },
  { href: '/maestros/materiales', icon: 'category', label: 'Materiales' },
  { href: '/precios/lista', icon: 'sell', label: 'Precios' },
  { href: '/precios/descuentos', icon: 'percent', label: 'Descuentos' },
  { href: '/precios/cupones', icon: 'confirmation_number', label: 'Cupones' },
  { href: '/precios/promociones', icon: 'campaign', label: 'Promociones' },
]

const bottomItems: any[] = []

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [maestrosOpen, setMaestrosOpen] = useState(
    maestrosItems.some((i) => pathname.startsWith(i.href))
  )
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  function isActive(href: string) {
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      const allItems = [...navItems, ...maestrosItems]
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
          <p className="text-slate-500 text-xs font-medium mt-0.5">{user?.empresa || 'Administración General'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Main nav */}
        {navItems.map((item) => (
          <a
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
          </a>
        ))}

        {/* Maestros accordion */}
        <div className="pt-2">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Maestros
          </p>
          <button
            onClick={() => setMaestrosOpen(!maestrosOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium text-slate-400 hover:text-white"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">database</span>
              Maestros
            </div>
            <span
              className={cn(
                'material-symbols-outlined text-base transition-transform duration-200',
                maestrosOpen ? 'rotate-180' : ''
              )}
            >
              expand_more
            </span>
          </button>

          {maestrosOpen && (
            <div className="ml-9 mt-1 space-y-0.5">
              {maestrosItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  )}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          )}
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
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-3">
          <div className="flex items-start gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl shrink-0">schedule</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tu prueba del plan Premium vence en 14 días.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-[10px] font-bold bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-tight">
              Actualizar Ahora
            </button>
            <button className="flex-1 text-[10px] font-bold bg-slate-700 text-white py-2 rounded-lg hover:bg-slate-600 transition-colors uppercase tracking-tight">
              Cambiar Plan
            </button>
          </div>
        </div>

        {/* User profile */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
        >
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">person</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.nombre || 'Usuario'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.rol || 'admin'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500 group-hover:text-red-400 transition-colors text-lg">
            logout
          </span>
        </button>
      </div>
    </aside>
  )
}
