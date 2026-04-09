'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import EsquemaCalculoForm from '../../components/EsquemaCalculoForm'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'

export default function EditarEsquemaPage() {
  const { id } = useParams()
  const [esquema, setEsquema] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEsquema = async () => {
      try {
        const res = await apiFetch(`/api/esquemas-calculo?id=${id}`)
        const json = await res.json()
        setEsquema(json.data)
      } catch (error) {
        toast.error('Error al cargar esquema de cálculo')
      } finally {
        setLoading(false)
      }
    }
    fetchEsquema()
  }, [id])

  if (loading) return (
    <div className="flex-1 min-h-screen bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Iniciando motor...</p>
    </div>
  )
  
  if (!esquema) return <div className="p-8 text-slate-500 font-bold uppercase text-xs tracking-widest">Esquema no encontrado</div>

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
      <Topbar title={`Editando: ${esquema.codigo}`} />
      <div className="flex-1 overflow-hidden">
        <EsquemaCalculoForm esquemaToEdit={esquema} />
      </div>
    </div>
  )
}
