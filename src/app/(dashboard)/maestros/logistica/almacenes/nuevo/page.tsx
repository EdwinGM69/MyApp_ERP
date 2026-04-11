import Topbar from '@/components/layout/Topbar'
import AlmacenForm from '../components/AlmacenForm'

export default function NuevoAlmacenPage() {
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <Topbar title="Gestión de Almacenes" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <AlmacenForm />
      </div>
    </div>
  )
}
