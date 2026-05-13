'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/hooks/useAuth'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000
const PROACTIVE_REFRESH_MS = 12 * 60 * 1000

// Throttle interval: ignore rapid-fire events within this window
const ACTIVITY_THROTTLE_MS = 5_000

export function SessionManager() {
  const user = useAuthStore(s => s.user)
  const forceLogout = useAuthStore(s => s.forceLogout)

  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // ── refs for timers ──
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef<boolean>(false)

  // ── stable refs so closures always see the latest value ──
  const userRef = useRef(user)
  userRef.current = user

  const forceLogoutRef = useRef(forceLogout)
  forceLogoutRef.current = forceLogout

  // ────────────────────────────────────────────────────────
  // Helper: clear every pending timer
  // ────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null }
    if (warningTimerRef.current)    { clearTimeout(warningTimerRef.current);    warningTimerRef.current = null }
    if (refreshTimerRef.current)    { clearTimeout(refreshTimerRef.current);    refreshTimerRef.current = null }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
  }, [])

  // ────────────────────────────────────────────────────────
  // Logout
  // ────────────────────────────────────────────────────────
  const doLogout = useCallback(async () => {
    clearAllTimers()
    setShowWarning(false)
    await forceLogoutRef.current()
  }, [clearAllTimers])

  // Store doLogout in a ref so setTimeout callbacks always use the latest
  const doLogoutRef = useRef(doLogout)
  doLogoutRef.current = doLogout

  // ────────────────────────────────────────────────────────
  // Proactive token refresh
  // ────────────────────────────────────────────────────────
  const doRefresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        console.log('[SessionManager] Proactive refresh successful')
      } else if (res.status === 401) {
        const inactiveTime = Date.now() - lastActivityRef.current
        if (inactiveTime >= INACTIVITY_TIMEOUT_MS) {
          console.warn('[SessionManager] Refresh 401 + inactive → logout')
          await doLogoutRef.current()
        } else {
          console.warn('[SessionManager] Refresh 401 but user was active recently, ignoring')
        }
      }
    } catch (error) {
      const inactiveTime = Date.now() - lastActivityRef.current
      if (inactiveTime >= INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS) {
        console.error('[SessionManager] Refresh error + inactive → logout', error)
        await doLogoutRef.current()
      } else {
        console.warn('[SessionManager] Refresh error but user is active, ignoring')
      }
    }
  }, [])

  // ────────────────────────────────────────────────────────
  // Core: reset all inactivity / warning / refresh timers
  // This function is called on every qualifying user activity.
  // It uses NO useCallback dependencies that could go stale;
  // instead it reads from refs.
  // ────────────────────────────────────────────────────────
  const resetTimers = useCallback(() => {
    if (!userRef.current) return

    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setShowWarning(false)

    // Clear previous timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (warningTimerRef.current)    clearTimeout(warningTimerRef.current)
    if (refreshTimerRef.current)    clearTimeout(refreshTimerRef.current)

    // 1) Hard logout after full inactivity window
    inactivityTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Inactivity timeout reached → logout')
      doLogoutRef.current()
    }, INACTIVITY_TIMEOUT_MS)

    // 2) Show warning dialog before the hard logout
    warningTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Showing inactivity warning')
      warningShownRef.current = true
      setShowWarning(true)
      setRemainingSeconds(Math.floor(WARNING_BEFORE_MS / 1000))
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)

    // 3) Proactive token refresh while user is active
    refreshTimerRef.current = setTimeout(() => {
      console.log('[SessionManager] Proactive refresh triggered')
      doRefresh()
    }, PROACTIVE_REFRESH_MS)
  }, [doRefresh])

  // Keep a ref so the stable event handler always calls the latest resetTimers
  const resetTimersRef = useRef(resetTimers)
  resetTimersRef.current = resetTimers

  // ────────────────────────────────────────────────────────
  // Single effect: wire up event listeners + countdown
  // The event handler is defined once (stable reference)
  // and reads from refs, so it never goes stale.
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      clearAllTimers()
      setShowWarning(false)
      return
    }

    console.log('[SessionManager] Initialising session timers')

    // ── Throttled activity handler (stable – never recreated) ──
    let lastHandledAt = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastHandledAt < ACTIVITY_THROTTLE_MS) return // throttle
      lastHandledAt = now
      console.log('[SessionManager] Activity detected – resetting timers')
      resetTimersRef.current()
    }

    // Listen on a wide set of interaction events (capture phase)
    const events: string[] = [
      'mousedown', 'keydown', 'scroll', 'touchstart',
      'mousemove', 'click', 'input', 'wheel',
    ]
    events.forEach(evt => document.addEventListener(evt, onActivity, true))

    // Also reset on tab-refocus
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        const inactiveMs = Date.now() - lastActivityRef.current
        console.log(`[SessionManager] Tab visible after ${Math.round(inactiveMs / 1000)}s`)
        // Only reset if the session hasn't fully expired already
        if (inactiveMs < INACTIVITY_TIMEOUT_MS) {
          resetTimersRef.current()
        }
      }
    }
    window.addEventListener('visibilitychange', onVisibility)

    // Kick off the first set of timers
    resetTimersRef.current()

    // ── Countdown interval for the warning dialog ──
    countdownIntervalRef.current = setInterval(() => {
      if (!warningShownRef.current) return
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsed) / 1000))
      setRemainingSeconds(remaining)
    }, 1000)

    return () => {
      events.forEach(evt => document.removeEventListener(evt, onActivity, true))
      window.removeEventListener('visibilitychange', onVisibility)
      clearAllTimers()
    }
    // Only re-run when the user logs in / out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ────────────────────────────────────────────────────────
  // UI: "Continue" button in warning dialog
  // ────────────────────────────────────────────────────────
  const handleContinueSession = useCallback(() => {
    console.log('[SessionManager] User chose to continue session')
    resetTimersRef.current()
  }, [])

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
              onClick={() => doLogoutRef.current()}
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