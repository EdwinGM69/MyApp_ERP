'use client'

import { useEffect, useState, use } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import MaterialForm from '../../components/MaterialForm'

export default function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMaterial() {
      try {
        const res = await apiFetch(`/api/materiales/${id}`)
        const json = await res.json()
        setMaterial(json.data)
      } catch (error) {
        console.error('Error fetching material:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterial()
  }, [id])

  if (loading) return (
    <div className="flex flex-col flex-1">
      <Topbar title="Editar Material" />
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Editar Material" />
      <div className="flex-1 overflow-y-auto min-h-0">
        {material && <MaterialForm materialToEdit={material} />}
      </div>
    </div>
  )
}
