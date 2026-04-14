'use client'

import { useState } from 'react'
import { useSucursal } from '@/contexts/SucursalContext'
import toast from 'react-hot-toast'

interface Sucursal {
  id: number
  descripcion: string
  direccion?: string
  departamento?: string
  provincia?: string
  distrito?: string
}

interface SucursalSelectorProps {
  onSelect?: () => void
  title?: string
  showTitle?: boolean
}

export default function SucursalSelector({ onSelect, title = "Seleccionar Sucursal", showTitle = true }: SucursalSelectorProps) {
  const { userSucursales, setCurrentSucursal, isLoading } = useSucursal()
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null)
  const [isSetting, setIsSetting] = useState(false)

  const handleSelectSucursal = async () => {
    if (!selectedSucursalId) {
      toast.error('Seleccione una sucursal')
      return
    }

    const selectedSucursal = userSucursales.find(s => s.id === selectedSucursalId)
    if (!selectedSucursal) return

    setIsSetting(true)
    try {
      await setCurrentSucursal(selectedSucursal)
      toast.success(`Sucursal ${selectedSucursal.descripcion} seleccionada`)
      if (onSelect) onSelect()
    } catch (error) {
      toast.error('Error al seleccionar sucursal')
    } finally {
      setIsSetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {showTitle && (
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-600">
            Seleccione la sucursal con la que desea trabajar
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {userSucursales.map((sucursal) => (
          <label
            key={sucursal.id}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedSucursalId === sucursal.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="sucursal"
              value={sucursal.id}
              checked={selectedSucursalId === sucursal.id}
              onChange={() => setSelectedSucursalId(sucursal.id)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{sucursal.descripcion}</div>
              {sucursal.direccion && (
                <div className="text-sm text-gray-600">{sucursal.direccion}</div>
              )}
              {(sucursal.departamento || sucursal.provincia || sucursal.distrito) && (
                <div className="text-xs text-gray-500">
                  {[sucursal.departamento, sucursal.provincia, sucursal.distrito]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSelectSucursal}
        disabled={!selectedSucursalId || isSetting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSetting ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Configurando...
          </span>
        ) : (
          'Seleccionar Sucursal'
        )}
      </button>
    </div>
  )
}