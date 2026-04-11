'use client'

import Topbar from '@/components/layout/Topbar'
import MarcaForm from '../components/MarcaForm'

export default function NuevoMarcaPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Marcas" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <MarcaForm />
      </div>
    </div>
  )
}
