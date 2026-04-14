import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pool: Pool | null }

let pool: Pool | null = null

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

const connectionString = dbUrl.replace('sslmode=require', '').replace('sslmode=verify-full', '').replace('&&', '&').replace('?&', '?').replace(/&\s*$/, '').replace(/\?$/, '')

console.log('[PRISMA] Environment:', process.env.NODE_ENV)
console.log('[PRISMA] Using connection string:', connectionString.replace(/:[^:@]+@/, ':****@'))

// SSL configuration - allow self-signed certificates
const env = process.env.NODE_ENV?.trim()
const sslConfig = env === 'production'
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }

console.log('[PRISMA] SSL config:', JSON.stringify(sslConfig))

pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ 
    adapter,
    transactionOptions: {
      maxWait: 30000,
      timeout: 30000,
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}

process.on('beforeExit', async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
})

export default prisma
