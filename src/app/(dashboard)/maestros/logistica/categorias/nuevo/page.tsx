'use client'

import Topbar from '@/components/layout/Topbar'
import CategoriaForm from '../components/CategoriaForm'

export default function NuevoCategoriaPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Categorías" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <CategoriaForm />
      </div>
    </div>
  )
}
