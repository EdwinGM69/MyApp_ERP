import EmpresaForm from '@/components/empresa/EmpresaForm'
import Topbar from '@/components/layout/Topbar'

export default function EmpresaPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Empresa" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
        <EmpresaForm />
      </div>
    </div>
  )
}
