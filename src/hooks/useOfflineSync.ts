'use client'

import { useEffect, useState } from 'react'
import { openDB } from 'idb'
import { apiFetch } from './useAuth'

const DB_NAME = 'erp-offline-db'
const STORE = 'pending-requests'

interface PendingRequest {
  id?: number
  endpoint: string
  method: string
  data: unknown
  timestamp: number
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function updatePendingCount() {
      try {
        const db = await getDB()
        const all = await db.getAll(STORE)
        setPendingCount(all.length)
      } catch {}
    }

    const handleOnline = () => {
      setIsOnline(true)
      syncPendingRequests()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function saveOffline(endpoint: string, method: string, data: unknown): Promise<void> {
    const db = await getDB()
    await db.add(STORE, { endpoint, method, data, timestamp: Date.now() })
    const all = await db.getAll(STORE)
    setPendingCount(all.length)
  }

  async function syncPendingRequests(): Promise<void> {
    try {
      const db = await getDB()
      const all: PendingRequest[] = await db.getAll(STORE)
      for (const req of all) {
        try {
          const res = await apiFetch(req.endpoint, {
            method: req.method,
            body: JSON.stringify(req.data),
          })
          if (res.ok && req.id !== undefined) {
            await db.delete(STORE, req.id)
          }
        } catch {
          break // Stop on failure, retry later
        }
      }
      const remaining = await db.getAll(STORE)
      setPendingCount(remaining.length)
    } catch {}
  }

  return { isOnline, pendingCount, saveOffline, syncPendingRequests }
}
