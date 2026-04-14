'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Sucursal {
  id: number
  descripcion: string
  direccion?: string
  departamento?: string
  provincia?: string
  distrito?: string
  activo: boolean
}

interface SucursalContextType {
  currentSucursal: Sucursal | null
  userSucursales: Sucursal[]
  hasSucursales: boolean
  isLoading: boolean
  error: string | null
  setCurrentSucursal: (sucursal: Sucursal | null) => Promise<void>
  refreshSucursales: () => Promise<void>
  validateSucursalAccess: (moduleName: string) => boolean
}

const SucursalContext = createContext<SucursalContextType | undefined>(undefined)

interface SucursalProviderProps {
  children: ReactNode
}

export function SucursalProvider({ children }: SucursalProviderProps) {
  const [currentSucursal, setCurrentSucursalState] = useState<Sucursal | null>(null)
  const [userSucursales, setUserSucursales] = useState<Sucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const protectedModules = ['ventas', 'pos', 'gestion-caja', 'inventario']

  const validateSucursalAccess = (moduleName: string): boolean => {
    if (!protectedModules.includes(moduleName)) return true
    return userSucursales.length > 0 && currentSucursal !== null
  }

  const fetchUserSucursales = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/usuario/sucursales')
      if (!response.ok) {
        throw new Error('Error al cargar sucursales del usuario')
      }

      const data = await response.json()
      setUserSucursales(data.sucursales || [])

      // Set current sucursal based on logic
      if (data.sucursales && data.sucursales.length > 0) {
        if (data.lastSucursalId) {
          const lastSucursal = data.sucursales.find((s: Sucursal) => s.id === data.lastSucursalId)
          if (lastSucursal) {
            setCurrentSucursalState(lastSucursal)
          } else {
            // If last_sucursal_id is not in assigned sucursales, use first one and update DB
            setCurrentSucursalState(data.sucursales[0])
            await updateUserLastSucursal(data.sucursales[0].id)
          }
        } else {
          // No last_sucursal_id, use first one and update DB
          setCurrentSucursalState(data.sucursales[0])
          await updateUserLastSucursal(data.sucursales[0].id)
        }
      } else {
        setCurrentSucursalState(null)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching user sucursales:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserLastSucursal = async (sucursalId: number) => {
    try {
      await fetch('/api/usuario/last-sucursal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursalId })
      })
    } catch (err) {
      console.error('Error updating last sucursal:', err)
    }
  }

  const setCurrentSucursal = async (sucursal: Sucursal | null) => {
    setCurrentSucursalState(sucursal)
    if (sucursal) {
      await updateUserLastSucursal(sucursal.id)
    }
  }

  const refreshSucursales = async () => {
    await fetchUserSucursales()
  }

  useEffect(() => {
    fetchUserSucursales()
  }, [])

  const value: SucursalContextType = {
    currentSucursal,
    userSucursales,
    hasSucursales: userSucursales.length > 0,
    isLoading,
    error,
    setCurrentSucursal,
    refreshSucursales,
    validateSucursalAccess
  }

  return (
    <SucursalContext.Provider value={value}>
      {children}
    </SucursalContext.Provider>
  )
}

export function useSucursal(): SucursalContextType {
  const context = useContext(SucursalContext)
  if (context === undefined) {
    throw new Error('useSucursal must be used within a SucursalProvider')
  }
  return context
}