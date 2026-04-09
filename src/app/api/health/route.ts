import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if JWT secrets are properly configured
    const jwtSecretLength = process.env.JWT_SECRET?.length || 0
    const jwtRefreshSecretLength = process.env.JWT_REFRESH_SECRET?.length || 0

    // Check database connection (without exposing sensitive info)
    let dbStatus = 'unknown'
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
    } catch (dbErr) {
      console.error('[HEALTH] Database connection error:', dbErr)
      dbStatus = 'error'
    }

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      jwtSecretsConfigured: jwtSecretLength >= 32 && jwtRefreshSecretLength >= 32,
      databaseStatus: dbStatus,
      version: '1.0.0'
    }

    return NextResponse.json(healthStatus)
  } catch (err) {
    console.error('[HEALTH] Health check error:', err)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}