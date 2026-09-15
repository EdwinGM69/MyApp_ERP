'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore, apiFetch } from '@/hooks/useAuth'
import { useSucursal } from '@/contexts/SucursalContext'
import toast from 'react-hot-toast'
import UserAccountModal from './UserAccountModal'
import {
  AREAS,
  AREA_MAP,
  AreaMeta,
  AreaTrabajo,
  MenuItem,
  areaDesdeRuta,
  normalizarTexto,
} from '@/lib/menu'

// ------------------------------------------------------------------
// Vista de navegación: base (nivel 1) o contexto de un área (nivel 2)
// ------------------------------------------------------------------
type Vista =
  | { tipo: 'base' }
  | { tipo: 'area'; id: AreaTrabajo }

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Ícono por defecto basado en la etiqueta/ruta (si la BD no trae uno) */
function inferIcon(item: Pick<MenuItem, 'label' | 'ruta'>): string {
  const desc = item.label.toLowerCase()
  const ruta = (item.ruta ?? '').toLowerCase()

  if (desc.includes('punto de venta') || ruta.includes('pos')) return 'shopping_cart'
  if (desc.includes('inicio') || ruta.includes('dashboard')) return 'dashboard'
  if (desc.includes('cliente')) return 'group'
  if (desc.includes('kardex')) return 'contract'
  if (desc.includes('stock')) return 'search_insights'
  if (desc.includes('movimiento')) return 'sync_alt'
  if (desc.includes('material')) return 'widgets'
  if (desc.includes('marca')) return 'branding_watermark'
  if (desc.includes('categor')) return 'category'
  if (desc.includes('unidad')) return 'straighten'
  if (desc.includes('almac')) return 'warehouse'
  if (desc.includes('ubicacion') || desc.includes('ubicación')) return 'location_on'
  if (desc.includes('estado')) return 'fact_check'
  if (desc.includes('tipo') && desc.includes('operaci')) return 'list_alt'
  if (desc.includes('valoraci')) return 'payments'
  if (desc.includes('proveedor')) return 'local_shipping'
  if (desc.includes('banco')) return 'account_balance'
  if (desc.includes('moneda')) return 'paid'
  if (desc.includes('tipo') && desc.includes('cambio')) return 'currency_exchange'
  if (desc.includes('medio') && desc.includes('pago')) return 'credit_card'
  if (desc.includes('caja') || desc.includes('arqueo')) return 'account_balance_wallet'
  if (desc.includes('concepto')) return 'sell'
  if (desc.includes('condici')) return 'rule'
  if (desc.includes('promoci')) return 'campaign'
  if (desc.includes('cup') || desc.includes('cupón')) return 'confirmation_number'
  if (desc.includes('esquema')) return 'architecture'
  if (desc.includes('clase') && desc.includes('pedido')) return 'description'
  if (desc.includes('correlativo')) return 'tag'
  if (desc.includes('empresa')) return 'settings_applications'
  if (desc.includes('usuario')) return 'manage_accounts'
  if (desc.includes('rol') || desc.includes('permiso')) return 'admin_panel_settings'
  if (desc.includes('parámetro') || desc.includes('parametro')) return 'settings'
  if (desc.includes('país') || desc.includes('pais')) return 'public'
  if (desc.includes('industria')) return 'factory'
  if (desc.includes('documento')) return 'badge'
  if (desc.includes('venta') || desc.includes('pedido')) return 'storefront'
  return 'chevron_right'
}

function iconoDeItem(item: MenuItem): string {
  return item.icono || inferIcon(item)
}

// Sub-componente: enlace de ítem de menú (nivel 2)
function ItemLink({ item, isActive }: { item: MenuItem; isActive: (href: string) => boolean }) {
  const active = item.ruta ? isActive(item.ruta) : false

  return (
    <Link
      href={item.ruta ?? '#'}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-colors text-sm font-medium px-3 py-2',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      )}
    >
      <span className="material-symbols-outlined text-lg">{iconoDeItem(item)}</span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  )
}

// ------------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [vista, setVista] = useState<Vista>({ tipo: 'base' })
  const [busqueda, setBusqueda] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)
  const { currentSucursal, hasSucursales } = useSucursal()

  // ---- Cargar menú desde API (ya filtrado por rol en el servidor) ----
  useEffect(() => {
    setMounted(true)

    async function fetchMenu() {
      try {
        const res = await apiFetch('/api/menu')
        if (!res.ok) return
        const data = await res.json()
        const raw: MenuItem[] = data.menu ?? []
        // Normalización: la etiqueta "Dashboard" se muestra como "Inicio"
        setItems(
          raw.map((i) => ({
            ...i,
            label: i.ruta === '/dashboard' && i.label === 'Dashboard' ? 'Inicio' : i.label,
          }))
        )
      } catch {
        // Silencioso — el sidebar simplemente no muestra ítems
      } finally {
        setLoadingMenu(false)
      }
    }

    fetchMenu()
  }, [])

  // ---- Sincronizar vista con la ruta activa (deep-links y navegación) ----
  useEffect(() => {
    if (items.length === 0) return
    const area = areaDesdeRuta(items, pathname)
    if (area) setVista({ tipo: 'area', id: area })
  }, [pathname, items])

  // ---- Atajo global Ctrl/Cmd + K para enfocar la búsqueda ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---- Cerrar dropdown de búsqueda al hacer clic fuera ----
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ------------------------------------------------------------------
  // Derivados
  // ------------------------------------------------------------------

  const visibles = useMemo(() => items.filter((i) => i.visible_menu), [items])

  const itemsPorArea = useMemo(() => {
    const map = Object.fromEntries(
      AREAS.map((a) => [a.id, { operaciones: [] as MenuItem[], configuracion: [] as MenuItem[] }])
    ) as Record<AreaTrabajo, { operaciones: MenuItem[]; configuracion: MenuItem[] }>

    for (const item of visibles) {
      if (!item.ruta || !item.modulo || !item.grupo) continue
      map[item.modulo][item.grupo].push(item)
    }

    for (const a of AREAS) {
      map[a.id].operaciones.sort((x, y) => x.orden - y.orden)
      map[a.id].configuracion.sort((x, y) => x.orden - y.orden)
    }
    return map
  }, [visibles])

  /** Áreas con al menos una opción visible para el usuario (RBAC) */
  const areasDisponibles = useMemo(
    () =>
      AREAS.filter(
        (a) => itemsPorArea[a.id].operaciones.length + itemsPorArea[a.id].configuracion.length > 0
      ),
    [itemsPorArea]
  )

  /** Ítems de nivel raíz sin área (ej: Inicio) */
  const itemsRaiz = useMemo(
    () => visibles.filter((i) => i.modulo === null && i.ruta).sort((a, b) => a.orden - b.orden),
    [visibles]
  )

  /** Resultados de la búsqueda rápida (todas las áreas) */
  const resultados = useMemo(() => {
    const q = normalizarTexto(busqueda.trim())
    if (q.length < 2) return []
    return visibles
      .filter((i) => i.ruta)
      .map((item) => {
        const areaLabel = item.modulo ? AREA_MAP[item.modulo].label : null
        const hayado =
          normalizarTexto(item.label).includes(q) || (areaLabel ? normalizarTexto(areaLabel).includes(q) : false)
        return { item, areaLabel, hayado }
      })
      .filter((r) => r.hayado)
      .slice(0, 8)
  }, [busqueda, visibles])

  const areaActiva = vista.tipo === 'area' ? AREA_MAP[vista.id] : null

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------

  const abrirArea = useCallback(
    (area: AreaMeta) => {
      setVista({ tipo: 'area', id: area.id })
      if (area.ruta_inicio && pathname !== area.ruta_inicio && !pathname.startsWith(area.ruta_inicio + '/')) {
        router.push(area.ruta_inicio)
      }
    },
    [pathname, router]
  )

  const irAResultado = useCallback(
    (item: MenuItem) => {
      setBusqueda('')
      setSearchOpen(false)
      if (item.ruta) router.push(item.ruta)
    },
    [router]
  )

  function isActive(href: string) {
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) {
      const rutas = visibles.map((i) => i.ruta).filter(Boolean) as string[]
      const mejor = rutas
        .filter((r) => r !== href && pathname.startsWith(r))
        .sort((a, b) => b.length - a.length)[0]
      return !mejor
    }
    return false
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-primary rounded-lg size-10 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined text-xl">point_of_sale</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-white text-base font-bold leading-none">KAMAQ ONE</h1>
          <p className="text-slate-500 text-xs font-medium mt-1 truncate">
            {mounted ? (user?.empresa || 'Administración General') : ''}
          </p>
          {mounted && hasSucursales && currentSucursal && (
            <p className="text-slate-400 text-xs font-medium mt-0.5 flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-xs">business</span>
              {currentSucursal.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Búsqueda rápida de funciones */}
      <div ref={searchRef} className="relative px-4 pt-4">
        <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg px-3 focus-within:border-primary/60 transition-colors">
          <span className="material-symbols-outlined text-lg text-slate-500">search</span>
          <input
            ref={searchInputRef}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setSearchOpen(true)
              setActiveIndex(0)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false)
                setBusqueda('')
              }
              if (resultados.length === 0) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, resultados.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter' && resultados[activeIndex]) {
                irAResultado(resultados[activeIndex].item)
              }
            }}
            type="text"
            placeholder="Buscar función...  (Ctrl K)"
            className="w-full bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500 py-2.5"
          />
        </div>

        {searchOpen && busqueda.trim().length >= 2 && (
          <div className="absolute left-4 right-4 top-full mt-2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in duration-150">
            {resultados.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-500 text-center">
                Sin resultados para &ldquo;{busqueda}&rdquo;
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto py-1">
                {resultados.map((r, idx) => (
                  <button
                    key={r.item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => irAResultado(r.item)}
                    className={cn(
                      'w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors',
                      idx === activeIndex && 'bg-slate-700/70'
                    )}
                  >
                    <span className="material-symbols-outlined text-lg text-slate-400 shrink-0">
                      {iconoDeItem(r.item)}
                    </span>
                    <span className="flex-1 text-sm text-slate-200 truncate">{r.item.label}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {r.areaLabel || 'Inicio'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {loadingMenu ? (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-lg bg-slate-800/60 animate-pulse"
                style={{ width: `${70 + (i % 3) * 10}%` }}
              />
            ))}
          </div>
        ) : vista.tipo === 'base' ? (
          <VistaBase
            itemsRaiz={itemsRaiz}
            areasDisponibles={areasDisponibles}
            onAbrirArea={abrirArea}
            isActive={isActive}
          />
        ) : (
          <VistaArea
            area={areaActiva!}
            vista={vista}
            itemsPorArea={itemsPorArea}
            onVolver={() => setVista({ tipo: 'base' })}
            isActive={isActive}
          />
        )}
      </nav>

      {/* Alerta de suscripción compacta */}
      {mounted &&
        user?.subscriptionAlert &&
        !user.subscriptionAlert.sinSuscripcion &&
        user.subscriptionAlert.nivelAlerta !== 'none' && (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
              <span
                className={cn(
                  'material-symbols-outlined text-base shrink-0',
                  user.subscriptionAlert.nivelAlerta === 'critical'
                    ? 'text-red-500'
                    : user.subscriptionAlert.nivelAlerta === 'danger'
                      ? 'text-orange-400'
                      : 'text-amber-400'
                )}
              >
                warning
              </span>
              <p className="text-[11px] text-slate-300 leading-tight flex-1">
                {user.subscriptionAlert.vencida
                  ? `Su plan ${user.subscriptionAlert.planName || ''} ha expirado.`
                  : user.subscriptionAlert.enPeriodoGracia
                    ? `Período de gracia: quedan ${user.subscriptionAlert.diasGraciaRestantes} día(s).`
                    : `Tu ${user.subscriptionAlert.planName || ''} vence en ${user.subscriptionAlert.diasRestantes} día(s).`}
              </p>
              <button className="text-[10px] font-bold bg-primary text-white px-2 py-1 rounded-md hover:bg-primary-dark transition-colors uppercase">
                Actualizar
              </button>
            </div>
          </div>
        )}

      {/* Usuario · Mi cuenta · Cerrar sesión */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {mounted && user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary text-lg">person</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight truncate">
              {mounted ? (user?.nombre || 'Usuario') : ''}
            </p>
            <p className="text-[11px] text-slate-400 truncate capitalize">
              {mounted ? (user?.rol || '') : ''}
            </p>
          </div>
          <button
            onClick={() => setAccountOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            title="Mi cuenta"
          >
            <span className="material-symbols-outlined text-lg">manage_accounts</span>
          </button>
        </div>
        <p className="px-3 pt-2 flex items-center gap-1 text-[11px] text-slate-500">
          <button onClick={() => setAccountOpen(true)} className="hover:text-slate-300 transition-colors">
            Mi cuenta
          </button>
          <span className="text-slate-600">·</span>
          <button onClick={handleLogout} className="hover:text-slate-300 transition-colors">
            Cerrar sesión
          </button>
        </p>
      </div>

      <UserAccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </aside>
  )
}

// ------------------------------------------------------------------
// Vista base (nivel 1): Inicio + áreas agrupadas por sección
// ------------------------------------------------------------------

function VistaBase({
  itemsRaiz,
  areasDisponibles,
  onAbrirArea,
  isActive,
}: {
  itemsRaiz: MenuItem[]
  areasDisponibles: AreaMeta[]
  onAbrirArea: (area: AreaMeta) => void
  isActive: (href: string) => boolean
}) {
  const operaciones = areasDisponibles.filter((a) => a.seccion === 'operaciones')
  const configuracion = areasDisponibles.filter((a) => a.seccion === 'configuracion')

  return (
    <div className="space-y-0.5">
      {itemsRaiz.map((item) => (
        <ItemLink key={item.id} item={item} isActive={isActive} />
      ))}

      {operaciones.length > 0 && (
        <div className="pt-3">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Operaciones
          </p>
          {operaciones.map((area) => (
            <AreaButton key={area.id} area={area} onClick={() => onAbrirArea(area)} />
          ))}
        </div>
      )}

      {configuracion.length > 0 && (
        <div className="pt-3">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Configuración
          </p>
          {configuracion.map((area) => (
            <AreaButton key={area.id} area={area} onClick={() => onAbrirArea(area)} />
          ))}
        </div>
      )}

      {itemsRaiz.length === 0 && areasDisponibles.length === 0 && (
        <p className="px-3 py-4 text-xs text-slate-500 text-center">
          Sin opciones de menú disponibles.
        </p>
      )}
    </div>
  )
}

function AreaButton({ area, onClick }: { area: AreaMeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white group"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-primary transition-colors">
          {area.icono}
        </span>
        <span className="truncate">{area.label}</span>
      </span>
      <span className="material-symbols-outlined text-base text-slate-500 group-hover:text-slate-300 transition-colors">
        chevron_right
      </span>
    </button>
  )
}

// ------------------------------------------------------------------
// Vista de contexto (nivel 2): accesos del área + configuración
// ------------------------------------------------------------------

function VistaArea({
  area,
  vista,
  itemsPorArea,
  onVolver,
  isActive,
}: {
  area: AreaMeta
  vista: Extract<Vista, { tipo: 'area' }>
  itemsPorArea: Record<AreaTrabajo, { operaciones: MenuItem[]; configuracion: MenuItem[] }>
  onVolver: () => void
  isActive: (href: string) => boolean
}) {
  const frecuentes = itemsPorArea[vista.id].operaciones
  const configuracion = itemsPorArea[vista.id].configuracion

  return (
    <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-150">
      <button
        onClick={onVolver}
        className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-wider"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Volver
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-2 pt-2 pb-1">
        <span className="material-symbols-outlined text-2xl text-primary">{area.icono}</span>
        <div className="leading-tight">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {area.seccion === 'operaciones' ? 'Operaciones' : 'Configuración'}
          </p>
          <p className="text-sm font-bold text-white">{area.label}</p>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        {frecuentes.length > 0 && (
          <>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">
              {area.tituloFrecuentes}
            </p>
            {frecuentes.map((item) => (
              <ItemLink key={item.id} item={item} isActive={isActive} />
            ))}
          </>
        )}

        {configuracion.length > 0 && (
          <>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
              {area.tituloConfiguracion}
            </p>
            {configuracion.map((item) => (
              <ItemLink key={item.id} item={item} isActive={isActive} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}