'use client'

import React from 'react'
import Topbar from '@/components/layout/Topbar'
import UsuarioForm from '../components/UsuarioForm'

export default function NuevoUsuarioPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Gestión de Usuarios / Nuevo" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark">
        <UsuarioForm />
      </main>
    </div>
  )
}
