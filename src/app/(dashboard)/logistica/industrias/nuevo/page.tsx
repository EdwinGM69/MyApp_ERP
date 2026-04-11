import Topbar from '@/components/layout/Topbar'
import IndustriaForm from '../components/IndustriaForm'

export default function NuevaIndustriaPage() {
  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Industrias" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <IndustriaForm />
      </div>
    </div>
  )
}
