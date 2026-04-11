'use client'

import { useEffect, useState, use } from 'react'
import Topbar from '@/components/layout/Topbar'
import UbicacionForm from '../../components/UbicacionForm'
import { apiFetch } from '@/hooks/useAuth'

interface Ubicacion {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
}

export default function EditarUbicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiFetch(`/api/logistica/ubicaciones/${id}`)
        if (res.ok) {
          const json = await res.json()
          setUbicacion(json)
        }
      } catch (error) {
        console.error('Error fetching ubicacion:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        {ubicacion ? <UbicacionForm ubicacionToEdit={ubicacion} /> : <div className="p-8 text-center text-red-500">Ubicación no encontrada</div>}
      </div>
    </div>
  )
}
