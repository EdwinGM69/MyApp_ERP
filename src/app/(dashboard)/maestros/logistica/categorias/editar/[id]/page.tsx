'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import CategoriaForm from '../../components/CategoriaForm'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function EditarCategoriaPage() {
  const params = useParams()
  const id = params.id
  const [categoria, setCategoria] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      async function fetchCategoria() {
        try {
          const res = await apiFetch(`/api/materiales/categorias?id=${id}`)
          if (!res.ok) throw new Error('Error al cargar la categoría')
          const json = await res.json()
          setCategoria(json.data)
        } catch (error: any) {
          toast.error(error.message)
        } finally {
          setLoading(false)
        }
      }
      fetchCategoria()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <Topbar title="Gestión de Categorías" />
        <div className="flex-1 flex items-center justify-center bg-slate-50/50">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">progress_activity</span>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Categorías" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <CategoriaForm categoriaToEdit={categoria} />
      </div>
    </div>
  )
}
