'use client'

import React, { useState, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import UsuarioForm from '../../components/UsuarioForm'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function EditarUsuarioPage() {
  const { id } = useParams()
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsuario() {
      try {
        const res = await apiFetch(`/api/usuarios/${id}`)
        if (!res.ok) {
          toast.error('Error al cargar la información del usuario')
          router.push('/usuarios')
          return
        }
        const json = await res.json()
        setUsuario(json.data)
      } catch (error) {
        toast.error('Error de conexión')
        router.push('/usuarios')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchUsuario()
  }, [id, router])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Gestión de Usuarios / Editar" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <span className="material-symbols-outlined animate-spin text-4xl text-blue-600">progress_activity</span>
          </div>
        ) : (
          <UsuarioForm usuarioToEdit={usuario} />
        )}
      </main>
    </div>
  )
}
