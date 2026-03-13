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
}

interface AuthStore {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  isAdmin: () => boolean
}

// Simple store using module-level state (zustand-compatible pattern without the package)
let _store: AuthStore | null = null

function createStore(): AuthStore {
  let token: string | null = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  let user: AuthUser | null = null

  try {
    const u = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null
    if (u) user = JSON.parse(u)
  } catch {}

  const store: AuthStore = {
    token,
    user,
    setAuth(newToken, newUser) {
      store.token = newToken
      store.user = newUser
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', newToken)
        localStorage.setItem('auth_user', JSON.stringify(newUser))
      }
    },
    clearAuth() {
      store.token = null
      store.user = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('auth_user')
      }
    },
    isAdmin() {
      return store.user?.rol === 'admin'
    },
  }

  return store
}

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  if (!_store) _store = createStore()
  return selector(_store)
}

export function getToken(): string | null {
  if (!_store) _store = createStore()
  return _store.token
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!_store) _store = createStore()
  let token = _store.token

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
    if (refreshRes.ok) {
      const { accessToken } = await refreshRes.json()
      _store.setAuth(accessToken, _store.user!)
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {}),
        },
      })
    } else {
      _store.clearAuth()
      window.location.href = '/login'
    }
  }

  return res
}
