'use client'

import { create } from 'zustand'

interface AuthUser {
  id: number
  nombre: string
  email: string
  avatar_url?: string | null
  rol: string
  empresa: string
  empresaId: number
  monedaDefault: string
  monedaId?: number
  monedaSimbolo: string
}

interface AuthStore {
  token: string | null
  user: AuthUser | null
  initialized: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  isAdmin: () => boolean
  refreshSession: () => Promise<void>
  setInitialized: (val: boolean) => void
  forceLogout: () => Promise<void>
}

// Simple store using module-level state
let _store: AuthStore | null = null

function createStore(): AuthStore {
  // Try to get token from localStorage on init
  let token: string | null = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  let user: AuthUser | null = null
  let initialized = false

  try {
    const u = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null
    if (u) {
      const parsed = JSON.parse(u)
      if (parsed) {
        if (typeof parsed.rol === 'object' && parsed.rol !== null) {
          parsed.rol = parsed.rol.nombre || 'usuario'
        }
        if (typeof parsed.empresa === 'object' && parsed.empresa !== null) {
          parsed.empresa = parsed.empresa.nombre || 'Empresa'
        }
        user = parsed
        initialized = true
      }
    }
  } catch {}

  const store: AuthStore = {
    token,
    user,
    initialized,
    setAuth(newToken, newUser) {
      if (newUser) {
        if (typeof newUser.rol === 'object' && newUser.rol !== null) {
          newUser.rol = (newUser.rol as any).nombre || 'usuario'
        }
        if (typeof newUser.empresa === 'object' && newUser.empresa !== null) {
          newUser.empresa = (newUser.empresa as any).nombre || 'Empresa'
        }
      }
      store.token = newToken
      store.user = newUser
      store.initialized = true
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', newToken)
        localStorage.setItem('auth_user', JSON.stringify(newUser))
      }
    },
    clearAuth() {
      store.token = null
      store.user = null
      store.initialized = true
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('auth_user')
        // Force clear cookies
        document.cookie = 'access_token=; Max-Age=0; path=/;';
        document.cookie = 'refresh_token=; Max-Age=0; path=/;';
      }
    },
    isAdmin() {
      return store.user?.rol === 'admin'
    },
    setInitialized(val) {
      store.initialized = val
    },
    async forceLogout() {
      console.log('[Auth] Forcing full logout...')
      store.clearAuth()
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (e) {
        console.error('[Auth] Error clearing cookies during logout:', e)
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    },
    async refreshSession() {
      try {
        const res = await apiFetch('/api/auth/me')
        if (res.ok) {
          const { user: newUser } = await res.json()
          store.user = newUser
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_user', JSON.stringify(newUser))
          }
        } else {
          if (res.status === 401) {
            store.clearAuth()
          }
        }
      } catch (error) {
        console.error('Error refreshing session:', error)
      } finally {
        store.initialized = true
      }
    }
  }

  return store
}

// React Hook
export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  if (!_store) _store = createStore()
  return selector(_store)
}

// Plain function to get state
export function getAuthStore(): AuthStore {
  if (!_store) _store = createStore()
  return _store
}

export function getToken(): string | null {
  return getAuthStore().token
}

/**
 * Enhanced fetch wrapper
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const store = getAuthStore()
  
  const headers = new Headers(options.headers)
  if (store.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${store.token}`)
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    console.log(`[apiFetch] 401 on ${url}, attempting refresh...`)
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
    
    if (refreshRes.ok) {
      console.log(`[apiFetch] Refresh successful, retrying ${url}`)
      const { accessToken } = await refreshRes.json()
      store.setAuth(accessToken, store.user!)
      
      const retryHeaders = new Headers(options.headers)
      retryHeaders.set('Authorization', `Bearer ${accessToken}`)
      return fetch(url, { ...options, headers: retryHeaders })
    } else {
      console.warn(`[apiFetch] Refresh failed, forcing logout`)
      await store.forceLogout()
      return new Response(null, { status: 401, statusText: 'Unauthorized - Refresh Failed' });
    }
  }

  return res
}
