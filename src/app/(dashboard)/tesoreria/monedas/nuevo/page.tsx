import Topbar from '@/components/layout/Topbar'
import MonedaForm from '../components/MonedaForm'

export default function NuevoMonedaPage() {
  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Monedas" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <MonedaForm />
      </div>
    </div>
  )
}
