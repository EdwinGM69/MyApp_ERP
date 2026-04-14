'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSucursal } from '@/contexts/SucursalContext'
import { useRouter } from 'next/navigation'
import SucursalSelector from '@/components/SucursalSelector'

interface SucursalGuardProps {
  children: ReactNode
  moduleName: string
  fallback?: ReactNode
}

export default function SucursalGuard({ children, moduleName, fallback }: SucursalGuardProps) {
  const { hasSucursales, currentSucursal, isLoading, error } = useSucursal()
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    if (!isLoading && !hasSucursales) {
      setShowSelector(false)
    } else if (!isLoading && hasSucursales && !currentSucursal) {
      setShowSelector(true)
    }
  }, [isLoading, hasSucursales, currentSucursal])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error al cargar información de sucursales</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!hasSucursales) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl text-orange-600">business</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
          <p className="text-gray-600 mb-4">
            Para acceder al módulo de {moduleName}, debe tener sucursales asignadas.
            Contacte al administrador para configurar sus sucursales.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (!currentSucursal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <SucursalSelector
          onSelect={() => setShowSelector(false)}
          title={`Seleccionar Sucursal para ${moduleName}`}
        />
      </div>
    )
  }

  return <>{children}</>
}