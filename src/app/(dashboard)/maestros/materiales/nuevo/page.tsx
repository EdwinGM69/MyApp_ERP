'use client'

import Topbar from '@/components/layout/Topbar'
import MaterialForm from '../components/MaterialForm'

export default function NuevoMaterialPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Materiales" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <MaterialForm />
      </div>
    </div>
  )
}
