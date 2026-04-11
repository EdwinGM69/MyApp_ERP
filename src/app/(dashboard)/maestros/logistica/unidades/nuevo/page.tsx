'use client'

import Topbar from '@/components/layout/Topbar'
import UnidadForm from '../components/UnidadForm'

export default function NuevaUnidadPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Nueva Unidad" />
      <div className="flex-1 overflow-auto">
        <UnidadForm />
      </div>
    </div>
  )
}
