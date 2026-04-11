'use client'

import PromocionForm from '../components/PromocionForm'
import Topbar from '@/components/layout/Topbar'

export default function NuevoPromocionPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 border-l border-slate-200/60 dark:border-slate-800/60">
      <Topbar title="Gestión de Promociones" />
      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <PromocionForm />
      </div>
    </div>
  )
}
