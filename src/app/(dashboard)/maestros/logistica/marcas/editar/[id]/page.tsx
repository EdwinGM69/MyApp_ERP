'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import MarcaForm from '../../components/MarcaForm'
import toast from 'react-hot-toast'

export default function EditarMarcaPage() {
  const { id } = useParams()
  const [marca, setMarca] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMarca() {
      try {
        const res = await apiFetch(`/api/marcas?id=${id}`)
        const json = await res.json()
        const item = json.data
        if (!item) throw new Error('Marca no encontrada')
        setMarca(item)
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMarca()
  }, [id])

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Topbar title="Gestión de Marcas" />
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-blue-600">progress_activity</span>
      </div>
    </div>
  )

  if (!marca) return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Topbar title="Gestión de Marcas" />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-slate-300">error</span>
        <p className="text-slate-500 font-bold">No se pudo cargar la marca</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Marcas" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <MarcaForm marcaToEdit={marca} />
      </div>
    </div>
  )
}
