import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import PlanCards, { PlanCard } from './PlanCards'

interface PlanPrecioData {
  id: number
  precio: string | number
  moneda: string
  mejor_valor: boolean
  mensaje_promocion: string | null
}

interface PlanCaracteristicaData {
  id: number
  descripcion: string
}

type PlanData = {
  id: number
  descripcion: string
  tipo_plan: string
  dias_duracion: number
  precios: PlanPrecioData[]
  caracteristicas: PlanCaracteristicaData[]
}

const monedaSymbols: Record<string, string> = {
  '1': 'S/',
  '2': '$',
}

function formatPrice(precio: string | number): string {
  const num = Number(precio)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function getPreferredPrecio(plan: PlanData): PlanPrecioData | null {
  if (plan.precios.length === 0) return null
  return (
    plan.precios.find((p) => p.mejor_valor) ||
    plan.precios[0]
  )
}

function toPlanCard(plan: PlanData): PlanCard {
  const precio = getPreferredPrecio(plan)
  const symbol = monedaSymbols[precio?.moneda ?? ''] ?? '$'
  const dias = plan.dias_duracion

  return {
    id: plan.id,
    name: plan.descripcion,
    price: `${symbol}${precio ? formatPrice(precio.precio) : '0'}`,
    period: `/ ${dias} días`,
    badge: precio?.mejor_valor ? 'MEJOR VALOR' : undefined,
    savings: precio?.mensaje_promocion ?? undefined,
    features: plan.caracteristicas.map((c) => c.descripcion),
    buttonText: `Comenzar ${plan.tipo_plan}`,
    recommended: precio?.mejor_valor ?? false,
    trial: plan.tipo_plan === 'TRIAL',
  }
}

async function loadPlans(): Promise<PlanCard[]> {
  const planes = await prisma.plan.findMany({
    where: { activo: true },
    orderBy: { orden_visual: 'asc' },
    include: {
      precios: {
        where: { activo: true },
        orderBy: { id: 'asc' },
      },
      caracteristicas: {
        where: { activo: true },
        orderBy: { id: 'asc' },
      },
    },
  })

  return planes.map((plan) => toPlanCard(plan as unknown as PlanData))
}

const getCachedPlans = unstable_cache(
  loadPlans,
  ['planes'],
  { revalidate: 300 }
)

export default async function RegisterPage() {
  let cards: PlanCard[] = []
  try {
    cards = await getCachedPlans()
  } catch (err) {
    console.error('[REGISTER] Error cargando planes:', err)
  }

  return (
    <div className="w-full max-w-none">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="bg-primary rounded-xl p-2.5 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-xl font-bold leading-none">KAMAQ ONE</h1>
          <p className="text-slate-400 text-xs mt-0.5">Sistema de Gestión</p>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl font-bold mb-2">
          Elige el plan ideal para tu negocio
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Comienza con nuestra prueba gratuita o elige un plan para desbloquear funciones avanzadas.
        </p>
      </div>

      {/* Plan Cards */}
      {cards.length > 0 ? (
        <PlanCards plans={cards} />
      ) : (
        <div className="text-center text-slate-400 text-sm py-12">
          Los planes no están disponibles en este momento. Inténtalo de nuevo más tarde.
        </div>
      )}

      {/* Login Link */}
      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-blue-400 font-semibold transition-colors"
        >
          Iniciar Sesión
        </Link>
      </p>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}