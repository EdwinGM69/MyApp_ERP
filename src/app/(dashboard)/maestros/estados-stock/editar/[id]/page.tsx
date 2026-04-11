'use client'

import { useEffect, useState, use } from 'react'
import Topbar from '@/components/layout/Topbar'
import EstadoStockForm from '../../components/EstadoStockForm'
import { apiFetch } from '@/hooks/useAuth'

interface EstadoStock {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
}

export default function EditarEstadoStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [estadoStock, setEstadoStock] = useState<EstadoStock | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiFetch(`/api/logistica/estados-stock/${id}`)
        if (res.ok) {
          const json = await res.json()
          setEstadoStock(json)
        }
      } catch (error) {
        console.error('Error fetching estado de stock:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        {estadoStock ? <EstadoStockForm estadoStockToEdit={estadoStock} /> : <div className="p-8 text-center text-red-500">Estado de stock no encontrado</div>}
      </div>
    </div>
  )
}
