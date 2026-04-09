'use client'

import React, { useState, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import ClienteForm from '../../components/ClienteForm'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function EditarClientePage() {
  const { id } = useParams()
  const router = useRouter()
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCliente() {
      try {
        const res = await apiFetch(`/api/clientes/${id}`)
        if (!res.ok) {
          toast.error('Error al cargar la información del cliente')
          router.push('/maestros/clientes')
          return
        }
        const json = await res.json()
        setCliente(json.data)
      } catch (error) {
        toast.error('Error de conexión')
        router.push('/maestros/clientes')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchCliente()
  }, [id, router])

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Catálogo de Clientes / Editar" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <span className="material-symbols-outlined animate-spin text-4xl text-blue-600">progress_activity</span>
          </div>
        ) : (
          <ClienteForm clienteToEdit={cliente} />
        )}
      </main>
    </div>
  )
}
