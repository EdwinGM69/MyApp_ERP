'use client'

import React from 'react'
import Topbar from '@/components/layout/Topbar'
import ClienteForm from '../components/ClienteForm'

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Catálogo de Clientes / Nuevo" />

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark min-h-0">
        <ClienteForm />
      </main>
    </div>
  )
}
