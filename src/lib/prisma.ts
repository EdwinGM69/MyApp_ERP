import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Use eval('require') to bypass Next.js bundling which is corrupting the 'pg' library
const { Pool } = eval('require')('pg')
const { PrismaPg } = eval('require')('@prisma/adapter-pg')

// Use the pooled DATABASE_URL from .env
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
