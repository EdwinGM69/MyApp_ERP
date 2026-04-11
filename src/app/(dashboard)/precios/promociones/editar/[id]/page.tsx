'use client'

import { useEffect, useState, use } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import PromocionForm from '../../components/PromocionForm'
import toast from 'react-hot-toast'
import Topbar from '@/components/layout/Topbar'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditarPromocionPage({ params }: PageProps) {
  const { id } = use(params)
  const [promocion, setPromocion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPromocion() {
      try {
        const res = await apiFetch(`/api/precios/promociones?id=${id}`)
        if (!res.ok) throw new Error('No se pudo cargar la promoción')
        const data = await res.json()
        setPromocion(data)
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPromocion()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
        <Topbar title="Gestión de Promociones" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 font-black">progress_activity</span>
            <p className="text-slate-500 font-bold tracking-widest text-[11px] uppercase">Cargando datos de promoción...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!promocion) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
        <Topbar title="Gestión de Promociones" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 font-bold uppercase tracking-widest">Promoción no encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60">
      <Topbar title="Gestión de Promociones" />
      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <PromocionForm promocionToEdit={promocion} />
      </div>
    </div>
  )
}
