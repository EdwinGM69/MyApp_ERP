'use client'

import { useState, useEffect, use } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import BancoForm from '../../components/BancoForm'
import toast from 'react-hot-toast'

export default function EditarBancoPage() {
  const params = useParams()
  const id = params.id
  const [banco, setBanco] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBanco = async () => {
      try {
        const res = await apiFetch(`/api/tesoreria/bancos?id=${id}`)
        const json = await res.json()
        setBanco(json.data)
      } catch (error) {
        toast.error('Error al cargar datos del banco')
      } finally {
        setLoading(false)
      }
    }
    fetchBanco()
  }, [id])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
  
  if (!banco) return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 font-medium">
      <span className="material-symbols-outlined text-6xl mb-4">error_outline</span>
      No se encontró el banco solicitado
    </div>
  )

  return <BancoForm bancoToEdit={banco} />
}
