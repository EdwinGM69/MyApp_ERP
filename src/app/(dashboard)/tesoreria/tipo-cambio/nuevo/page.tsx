'use client'

import Topbar from '@/components/layout/Topbar'
import TipoCambioForm from '../components/TipoCambioForm'

export default function NuevoTipoCambioPage() {
  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Tipo de Cambio" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <TipoCambioForm />
      </div>
    </div>
  )
}
