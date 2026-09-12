// ─────────────────────────────────────────────────────────────
// Utilidades de fechas con zona horaria de negocio (Perú).
//
// La base de datos corre en UTC y las columnas DateTime de Prisma
// son `timestamp` sin zona horaria. Por eso:
//  - El "hoy" del negocio se calcula en BUSINESS_TZ (America/Lima).
//  - Las fechas de documento se envían desde el cliente como un
//    instante a mediodía local (evita el off-by-one del midnight UTC).
//  - Los rangos de día para filtros Prisma se expresan como instantes
//    UTC (dayRangeUtc).
// ─────────────────────────────────────────────────────────────

export const BUSINESS_TZ = 'America/Lima'

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function getTzDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values: Record<string, string> = {}
  for (const p of parts) values[p.type] = p.value
  return {
    year: parseInt(values.year, 10),
    month: parseInt(values.month, 10),
    day: parseInt(values.day, 10),
  }
}

// Fecha "YYYY-MM-DD" local del runtime (navegador/servidor) usando componentes locales.
export function localToday(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// Fecha "YYYY-MM-DD" en la zona horaria del negocio.
export function businessToday(date: Date = new Date()): string {
  const p = getTzDateParts(date, BUSINESS_TZ)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

// Convierte "YYYY-MM-DD" a un Date a mediodía local. Al serializar con
// toISOString() se obtiene un instante del día correcto (sin depender del
// midnight UTC ni de DST). Para uso en el navegador (la fecha del negocio
// la conoce el cliente).
export function parseLocalNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

// Offset (ms) de BUSINESS_TZ respecto a UTC para una fecha dada.
function tzOffsetMs(dateStr: string): number {
  const probe = new Date(`${dateStr}T12:00:00.000Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(probe)
  const values: Record<string, string> = {}
  for (const p of parts) values[p.type] = p.value
  const wallAsUtc = Date.UTC(
    parseInt(values.year, 10),
    parseInt(values.month, 10) - 1,
    parseInt(values.day, 10),
    parseInt(values.hour, 10),
    parseInt(values.minute, 10),
    parseInt(values.second, 10),
    0
  )
  return wallAsUtc - probe.getTime()
}

// Inicio del día de negocio (fecha "YYYY-MM-DD") como instante UTC.
export function dayStartUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0)
  return new Date(utcMidnight - tzOffsetMs(dateStr))
}

// Rango de un día de negocio como { gte, lt } en instantes UTC.
export function dayRangeUtc(dateStr: string): { gte: Date; lt: Date } {
  const start = dayStartUtc(dateStr)
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0) - tzOffsetMs(dateStr))
  return { gte: start, lt: next }
}