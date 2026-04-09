'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import UnidadForm from '../../components/UnidadForm'
import toast from 'react-hot-toast'

export default function EditarUnidadPage() {
  const params = useParams()
  const id = params.id
  const [unidad, setUnidad] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUnidad = async () => {
      try {
        const res = await apiFetch(`/api/logistica/unidades?id=${id}`)
        if (!res.ok) throw new Error('Error al obtener unidad')
        const json = await res.json()
        setUnidad(json.data)
      } catch (error) {
        toast.error('Error al cargar la unidad de medida')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchUnidad()
  }, [id])

  if (loading) return <div className="p-8">Cargando...</div>
  if (!unidad) return <div className="p-8">Unidad no encontrada</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Editar Unidad" />
      <div className="flex-1 overflow-auto">
        <UnidadForm unidadToEdit={unidad} />
      </div>
    </div>
  )
}
