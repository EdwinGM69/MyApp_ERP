'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import TipoCambioForm from '../../components/TipoCambioForm'

interface TipoCambio {
  id: number
  moneda_base: number
  moneda_cotizada: number
  precio_compra: string
  precio_venta: string
  fuente_id?: number
  fecha_publicacion?: string
  inicio_vigencia?: string
  fin_vigencia?: string
  activo: boolean
  created_at?: string
  updated_at?: string
  usuario_creador?: { nombre: string }
  usuario_modificador?: { nombre: string }
  moneda_base_rel?: { id: number; descripcion: string; abreviatura: string; simbolo: string }
  moneda_cotizada_rel?: { id: number; descripcion: string; abreviatura: string; simbolo: string }
}

export default function EditarTipoCambioPage() {
  const params = useParams()
  const id = params.id as string
  const [tipoCambio, setTipoCambio] = useState<TipoCambio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTipoCambio() {
      try {
        const res = await apiFetch(`/api/tipo-cambio?id=${id}`)
        const json = await res.json()
        setTipoCambio(json.data)
      } catch (error) {
        console.error('Error fetching tipo cambio:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchTipoCambio()
  }, [id])

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>
  if (!tipoCambio) return <div className="p-8 text-center text-red-500 font-bold">Tipo de cambio no encontrado</div>

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Tipo de Cambio" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <TipoCambioForm tipoCambioToEdit={tipoCambio} />
      </div>
    </div>
  )
}
