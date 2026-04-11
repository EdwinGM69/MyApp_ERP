'use client'

import Topbar from '@/components/layout/Topbar'
import UbicacionForm from '../components/UbicacionForm'

export default function NuevoUbicacionPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Ubicaciones" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <UbicacionForm />
      </div>
    </div>
  )
}
