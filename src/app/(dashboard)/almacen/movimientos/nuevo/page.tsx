'use client'

import MovimientoAlmacenForm from '../components/MovimientoAlmacenForm'
import Topbar from '@/components/layout/Topbar'

export default function NuevoMovimientoAlmacenPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60">
      <Topbar title="Movimientos de Almacén" />
      <div className="flex-1 overflow-hidden min-h-0">
        <MovimientoAlmacenForm />
      </div>
    </div>
  )
}
