'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import IndustriaForm from '../../components/IndustriaForm'
import toast from 'react-hot-toast'

export default function EditarIndustriaPage() {
  const { id } = useParams()
  const [industria, setIndustria] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIndustria = async () => {
      try {
        const res = await apiFetch(`/api/logistica/industrias?id=${id}`)
        const json = await res.json()
        if (json.data) {
          setIndustria(json.data)
        } else {
          toast.error('Industria no encontrada')
        }
      } catch (error) {
        toast.error('Error al cargar industria')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchIndustria()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">progress_activity</span>
    </div>
  )

  if (!industria) return <div>No encontrada</div>

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Industrias" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <IndustriaForm industriaToEdit={industria} />
      </div>
    </div>
  )
}
