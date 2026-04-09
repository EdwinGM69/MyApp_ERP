'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import PaisForm from '../../components/PaisForm'
import toast from 'react-hot-toast'

export default function EditarPaisPage() {
  const params = useParams()
  const [pais, setPais] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPais = async () => {
      try {
        const res = await apiFetch(`/api/logistica/paises?id=${params.id}`)
        const json = await res.json()
        if (res.ok) {
          setPais(json.data)
        } else {
          toast.error(json.error || 'Error al cargar país')
        }
      } catch (error) {
        toast.error('Error al cargar país')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchPais()
  }, [params.id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">progress_activity</span>
    </div>
  )

  if (!pais) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <span className="material-symbols-outlined text-slate-300 text-6xl">public_off</span>
      <h3 className="text-xl font-black text-slate-900 dark:text-white">País no encontrado</h3>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Países" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <PaisForm paisToEdit={pais} />
      </div>
    </div>
  )
}
