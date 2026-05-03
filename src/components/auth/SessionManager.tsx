'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/hooks/useAuth'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000
const PROACTIVE_REFRESH_MS = 12 * 60 * 1000

export function SessionManager() {
  const user = useAuthStore(s => s.user)
  const forceLogout = useAuthStore(s => s.forceLogout)

  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef<boolean>(false)
  
  const userRef = useRef(user)
  userRef.current = user

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }
  }, [])

  const handleLogout = useCallback(async () => {
    clearAllTimers()
    await forceLogout()
  }, [forceLogout, clearAllTimers])

  const resetActivityTimers = useCallback(() => {
    console.log('[SessionManager] Resetting activity timers')
    if (!userRef.current) return

    lastActivityRef.current = Date.now()
    warningShownRef.current = false

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    inactivityTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Inactivity timeout reached')
      handleLogout()
    }, INACTIVITY_TIMEOUT_MS)

    warningTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Showing warning')
      warningShownRef.current = true
      setShowWarning(true)
      setRemainingSeconds(Math.floor(WARNING_BEFORE_MS / 1000))
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)

    refreshTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Proactive refresh triggered')
      handleRefresh()
    }, PROACTIVE_REFRESH_MS)
  }, [handleLogout])

  const handleRefresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        console.log('[SessionManager] Proactive refresh successful')
        resetActivityTimers()
      } else if (res.status === 401) {
        const inactiveTime = Date.now() - lastActivityRef.current
        if (inactiveTime < INACTIVITY_TIMEOUT_MS) {
          console.warn('[SessionManager] Refresh failed but user was active recently')
        } else {
          console.warn('[SessionManager] Proactive refresh failed (401), logging out')
          await handleLogout()
        }
      }
    } catch (error) {
      const inactiveTime = Date.now() - lastActivityRef.current
      if (inactiveTime < INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS) {
        console.warn('[SessionManager] Refresh error but user is active')
      } else {
        console.error('[SessionManager] Error during proactive refresh:', error)
        await handleLogout()
      }
    }
  }, [handleLogout, resetActivityTimers])

  const handleActivity = useCallback(() => {
    console.log('[SessionManager] Activity detected')
    if (!userRef.current) return
    resetActivityTimers()
  }, [resetActivityTimers])

  const handleContinueSession = useCallback(() => {
    console.log('[SessionManager] User chose to continue session')
    resetActivityTimers()
  }, [resetActivityTimers])

  useEffect(() => {
    console.log('[SessionManager] useEffect running, user:', !!user)
    if (!user) {
      clearAllTimers()
      setShowWarning(false)
      return
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click', 'input', 'focus', 'blur', 'wheel']

    console.log('[SessionManager] Adding event listeners for user activity')
    events.forEach(event => {
      if (document.body) {
        document.body.addEventListener(event, handleActivity, true)
      }
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        const inactiveTime = Date.now() - lastActivityRef.current
        console.log(`[SessionManager] Window became visible after ${Math.round(inactiveTime / 1000)}s of inactivity`)
        resetActivityTimers()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    resetActivityTimers()

    checkIntervalRef.current = setInterval(() => {
      if (warningShownRef.current && showWarning) {
        const elapsed = Date.now() - lastActivityRef.current
        const timeInWarning = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS
        const timeLeft = Math.max(0, Math.floor((timeInWarning - (elapsed - timeInWarning)) / 1000))
        setRemainingSeconds(prev => {
          if (prev > 0) return prev - 1
          return 0
        })
      }
    }, 1000)

    return () => {
      events.forEach(event => {
        if (document.body) {
          document.body.removeEventListener(event, handleActivity, true)
        }
      })
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      clearAllTimers()
    }
  }, [user, handleActivity, resetActivityTimers, clearAllTimers])

  if (!showWarning || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-amber-600 text-3xl">schedule</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Sesión por expirar
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Tu sesión ha estado inactiva. ¿Deseas continuar trabajando?
          </p>
          <div className="text-3xl font-black text-amber-600 mb-6">
            {remainingSeconds > 0 ? `${remainingSeconds}s` : '0s'}
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cerrar Sesión
            </button>
            <button
              onClick={handleContinueSession}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}