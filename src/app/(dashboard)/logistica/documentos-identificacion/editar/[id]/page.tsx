'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DocumentoIdentificacionForm from '../../components/DocumentoIdentificacionForm'
import toast from 'react-hot-toast'

export default function EditarDocumentoPage() {
  const { id } = useParams()
  const [documento, setDocumento] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocumento = async () => {
      try {
        const res = await apiFetch(`/api/logistica/documentos-identificacion?id=${id}`)
        const json = await res.json()
        if (json.data) {
          setDocumento(json.data)
        } else {
          toast.error('Documento no encontrado')
        }
      } catch (error) {
        toast.error('Error al cargar documento')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchDocumento()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">progress_activity</span>
    </div>
  )

  if (!documento) return <div>No encontrado</div>

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Documentos de Identificación" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <DocumentoIdentificacionForm documentoToEdit={documento} />
      </div>
    </div>
  )
}
