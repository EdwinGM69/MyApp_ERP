import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSubscriptionStatus } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req)
    const status = await getSubscriptionStatus(empresaId)
    return NextResponse.json({ subscription: status })
  } catch (err: any) {
    if (err.message !== 'Unauthorized') {
      console.error('[API/SUBSCRIPTION] Error:', err.message)
    }
    return NextResponse.json({ subscription: null }, { status: err.message === 'Unauthorized' ? 401 : 500 })
  }
}
