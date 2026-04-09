'use client'

import React from 'react'
import EsquemaCalculoForm from '../components/EsquemaCalculoForm'
import Topbar from '@/components/layout/Topbar'

export default function NuevoEsquemaPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
      <Topbar title="Nuevo Esquema de Cálculo" />
      <div className="flex-1 overflow-hidden">
        <EsquemaCalculoForm />
      </div>
    </div>
  )
}
