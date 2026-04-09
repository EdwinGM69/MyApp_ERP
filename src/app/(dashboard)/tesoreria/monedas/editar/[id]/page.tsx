'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import MonedaForm from '../../components/MonedaForm'

export default function EditarMonedaPage() {
  const params = useParams()
  const id = params.id as string
  const [moneda, setMoneda] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMoneda() {
      try {
        const res = await apiFetch(`/api/monedas?id=${id}`)
        const json = await res.json()
        setMoneda(json.data)
      } catch (error) {
        console.error('Error fetching moneda:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchMoneda()
  }, [id])

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>
  if (!moneda) return <div className="p-8 text-center text-red-500 font-bold">Moneda no encontrada</div>

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Monedas" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <MonedaForm monedaToEdit={moneda} />
      </div>
    </div>
  )
}
