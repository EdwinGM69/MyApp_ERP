import Topbar from '@/components/layout/Topbar'
import PaisForm from '../components/PaisForm'

export default function NuevoPaisPage() {
  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Países" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <PaisForm />
      </div>
    </div>
  )
}
