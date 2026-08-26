import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pool: Pool | null }

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
  
  // Fallback: usar DB_DIRECT_URL con reemplazo de marcadores o cadena por defecto
  const defaultDevUrl = 'postgres://postgres.jileukbohzeapbwbxmae:jdC0lXzFQFvuZ4Vd@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
  const fallbackUrl = process.env.DB_DIRECT_URL || process.env.DIRECT_URL || defaultDevUrl
  return fallbackUrl
    .replace('YOUR_PROJECT_REF', 'postgres.jileukbohzeapbwbxmae')
    .replace('YOUR_PASSWORD', 'jdC0lXzFQFvuZ4Vd')
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDbUrl()

  if (!dbUrl) {
    throw new Error('No database URL found. Please set DB_DIRECT_URL, DIRECT_URL, or DATABASE_URL environment variable.')
  }

  const connectionString = dbUrl
    .replace('sslmode=require', '')
    .replace('sslmode=verify-full', '')
    .replace('&&', '&')
    .replace('?&', '?')
    .replace(/&\s*$/, '')
    .replace(/\?$/, '')

  console.log('[PRISMA] Environment:', process.env.NODE_ENV)
  console.log('[PRISMA] Using connection string:', connectionString.replace(/:[^:@]+@/, ':****@'))

  // In serverless (Vercel), each function instance should use minimal connections.
  // Supabase PgBouncer has pool_size: 15, so we keep max very low to avoid
  // EMAXCONNSESSION errors when multiple serverless functions run concurrently.
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
  const poolMax = isServerless ? 2 : 10

  console.log('[PRISMA] Pool max connections:', poolMax, isServerless ? '(serverless)' : '(standard)')

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: poolMax,
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    connectionTimeoutMillis: 10000,
  })

  // Store pool reference for cleanup
  globalForPrisma.pool = pool

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 30000,
      timeout: 30000,
    }
  })
}

// CRITICAL: Cache in BOTH development AND production.
// In serverless environments, globalThis persists across warm invocations
// of the same function instance, preventing connection pool exhaustion.
export const prisma = globalForPrisma.prisma || createPrismaClient()

// Cache the singleton for ALL environments (including production/serverless)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

process.on('beforeExit', async () => {
  if (globalForPrisma.pool) {
    await globalForPrisma.pool.end()
    globalForPrisma.pool = null
  }
})

export default prisma
