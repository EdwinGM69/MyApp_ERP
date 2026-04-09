'use client'

import Topbar from '@/components/layout/Topbar'
import TipoForm from '../components/TipoForm'

export default function NuevoTipoPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Tipos de Material" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <TipoForm />
      </div>
    </div>
  )
}
