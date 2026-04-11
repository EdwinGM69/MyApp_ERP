'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/hooks/useAuth'

export function AuthRefresh() {
  const refreshSession = useAuthStore(s => s.refreshSession)
  const user = useAuthStore(s => s.user)
  const initialized = useAuthStore(s => s.initialized)

  useEffect(() => {
    // Only refresh if we haven't initialized yet and don't have a user
    if (!user && !initialized) {
      refreshSession()
    }
  }, [user, initialized, refreshSession])

  return null
}
