'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import TipoForm from '../../components/TipoForm'
import toast from 'react-hot-toast'

export default function EditarTipoPage() {
  const params = useParams()
  const id = params.id as string
  const [tipo, setTipo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTipo = async () => {
      try {
        const res = await apiFetch(`/api/materiales/tipos?id=${id}`)
        const json = await res.json()
        if (res.ok) {
          setTipo(json.data)
        } else {
          toast.error(json.error || 'Error al cargar tipo de material')
        }
      } catch (error) {
        toast.error('Error al cargar tipo de material')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchTipo()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <Topbar title="Gestión de Tipos de Material" />
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </div>
    )
  }

  if (!tipo) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <Topbar title="Gestión de Tipos de Material" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tipo de material no encontrado</h3>
          <p className="text-slate-500">El tipo de material que buscas no existe o ha sido eliminado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Tipos de Material" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <TipoForm tipoToEdit={tipo} />
      </div>
    </div>
  )
}
