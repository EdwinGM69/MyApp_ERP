'use client'

import React, { useState, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import ProveedorForm from '../../components/ProveedorForm'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function EditarProveedorPage() {
  const { id } = useParams()
  const router = useRouter()
  const [proveedor, setProveedor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProveedor() {
      try {
        const res = await apiFetch(`/api/proveedores/${id}`)
        if (!res.ok) {
          toast.error('Error al cargar la información del proveedor')
          router.push('/maestros/proveedores')
          return
        }
        const json = await res.json()
        setProveedor(json.data)
      } catch (error) {
        toast.error('Error de conexión')
        router.push('/maestros/proveedores')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProveedor()
  }, [id, router])

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Catálogo de Proveedores / Editar" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <span className="material-symbols-outlined animate-spin text-4xl text-blue-600">progress_activity</span>
          </div>
        ) : (
          <ProveedorForm proveedorToEdit={proveedor} />
        )}
      </main>
    </div>
  )
}
