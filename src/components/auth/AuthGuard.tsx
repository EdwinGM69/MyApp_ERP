'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialized && !user) {
      console.log('[AUTH_GUARD] No authenticated user, redirecting to login')
      router.push('/login')
    }
  }, [user, initialized, router])

  // Don't render anything on server or first client render until mounted
  // This prevents hydration mismatch
  if (!mounted || !initialized) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
        <div className="flex items-center justify-center w-full">
          <div className="text-slate-500 text-sm">Verificando autenticación...</div>
        </div>
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