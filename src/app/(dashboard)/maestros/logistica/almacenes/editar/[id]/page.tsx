'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import AlmacenForm from '../../components/AlmacenForm'
import toast from 'react-hot-toast'

export default function EditarAlmacenPage() {
  const { id } = useParams()
  const [almacen, setAlmacen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlmacen = async () => {
      try {
        const res = await apiFetch(`/api/logistica/almacenes?id=${id}`)
        const json = await res.json()
        if (json.data) {
          setAlmacen(json.data)
        } else {
          const errorMsg = json.error || 'Almacén no encontrado'
          toast.error(errorMsg)
          console.error('Error loading almacen:', errorMsg)
        }
      } catch (error: any) {
        toast.error('Error al cargar datos del almacén: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchAlmacen()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  )

  if (!almacen) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500">Almacén no encontrado</p>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <Topbar title="Gestión de Almacenes" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <AlmacenForm almacenToEdit={almacen} />
      </div>
    </div>
  )
}
