'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (initialized && !user) {
      console.log('[AUTH_GUARD] No authenticated user, redirecting to login')
      router.push('/login')
    }
  }, [user, initialized, router])

  // Show loading or nothing while checking authentication
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-white text-lg">Verificando autenticación...</div>
      </div>
    )
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!user) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}