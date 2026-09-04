import { prisma } from '@/lib/prisma'

export interface SubscriptionAlert {
  nivelAlerta: 'none' | 'info' | 'warning' | 'danger' | 'critical' | 'expired' | 'sin_suscripcion'
  diasRestantes: number | null
  diasGraciaRestantes: number | null
  enPeriodoGracia: boolean
  vencida: boolean
  sinSuscripcion: boolean
  planName: string | null
  planType: string | null
  periodicity: string | null
  fechaFin: string | null
  subscriptionId: number | null
}

function diffDays(future: Date, past: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.ceil((future.getTime() - past.getTime()) / msPerDay)
}

function getNivelAlerta(diasRestantes: number, enGracia: boolean): SubscriptionAlert['nivelAlerta'] {
  if (diasRestantes <= 0 && !enGracia) return 'expired'
  if (diasRestantes <= 1) return 'critical'
  if (diasRestantes <= 3) return 'critical'
  if (diasRestantes <= 7) return 'danger'
  if (diasRestantes <= 15) return 'warning'
  if (diasRestantes <= 30) return 'info'
  return 'none'
}

const NO_ALERT: SubscriptionAlert = {
  nivelAlerta: 'none',
  diasRestantes: null,
  diasGraciaRestantes: null,
  enPeriodoGracia: false,
  vencida: false,
  sinSuscripcion: false,
  planName: null,
  planType: null,
  periodicity: null,
  fechaFin: null,
  subscriptionId: null,
}

export async function getSubscriptionStatus(empresaId: number): Promise<SubscriptionAlert> {
  const now = new Date()

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { empresa_id: empresaId },
    orderBy: { created_at: 'desc' },
    include: {
      plan: {
        select: {
          descripcion: true,
          tipo_plan: true,
          dias_duracion: true,
        },
      },
    },
  })

  if (!suscripcion) {
    return {
      ...NO_ALERT,
      nivelAlerta: 'sin_suscripcion',
      sinSuscripcion: true,
    }
  }

  const fechaFin = suscripcion.fecha_fin
  if (!fechaFin) {
    return {
      ...NO_ALERT,
      planName: suscripcion.plan?.descripcion ?? null,
      planType: suscripcion.plan?.tipo_plan ?? null,
      subscriptionId: suscripcion.id,
    }
  }

  const diasRestantes = diffDays(fechaFin, now)

  let enPeriodoGracia = false
  let diasGraciaRestantes: number | null = null

  if (diasRestantes <= 0 && suscripcion.fin_gracia) {
    diasGraciaRestantes = diffDays(suscripcion.fin_gracia, now)
    if (diasGraciaRestantes > 0) {
      enPeriodoGracia = true
    }
  }

  const diasParaNivel = enPeriodoGracia ? diasGraciaRestantes! : diasRestantes
  const nivelAlerta = getNivelAlerta(diasParaNivel, enPeriodoGracia)
  const vencida = diasRestantes <= 0 && !enPeriodoGracia

  return {
    nivelAlerta,
    diasRestantes,
    diasGraciaRestantes,
    enPeriodoGracia,
    vencida,
    sinSuscripcion: false,
    planName: suscripcion.plan?.descripcion ?? null,
    planType: suscripcion.plan?.tipo_plan ?? null,
    periodicity: suscripcion.plan?.tipo_plan ?? null,
    fechaFin: fechaFin.toISOString(),
    subscriptionId: suscripcion.id,
  }
}
