import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getDbUrl(): string {
  const urls = [
    process.env.DB_DIRECT_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ]
  
  for (const url of urls) {
    if (url && !url.includes('YOUR_PROJECT_REF') && !url.includes('YOUR_PASSWORD')) {
      return url
    }
  }
  
  // Fallback: usar DB_DIRECT_URL con reemplazo de marcadores
  const fallbackUrl = process.env.DB_DIRECT_URL || process.env.DIRECT_URL || ''
  return fallbackUrl
    .replace('YOUR_PROJECT_REF', 'postgres.jileukbohzeapbwbxmae')
    .replace('YOUR_PASSWORD', 'jdC0lXzFQFvuZ4Vd')
}

const dbUrl = getDbUrl()

if (!dbUrl) {
  throw new Error('No database URL found. Please set DB_DIRECT_URL, DIRECT_URL, or DATABASE_URL environment variable.')
}

const connectionString = dbUrl.replace('sslmode=require', 'sslmode=verify-full')

console.log('[PRISMA] Environment:', process.env.NODE_ENV)
console.log('[PRISMA] Using connection string:', connectionString.replace(/:[^:@]+@/, ':****@'))

// SSL configuration - allow self-signed certificates for Supabase pooler
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler')
const sslConfig = isSupabase
  ? { rejectUnauthorized: false }
  : process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false }

const pool = new Pool({
  connectionString,
  ssl: sslConfig
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
