'use client'

import Topbar from '@/components/layout/Topbar'
import EstadoStockForm from '../components/EstadoStockForm'

export default function NuevoEstadoStockPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Estados de Stock" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <EstadoStockForm />
      </div>
    </div>
  )
}
