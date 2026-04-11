import Topbar from '@/components/layout/Topbar'
import DocumentoIdentificacionForm from '../components/DocumentoIdentificacionForm'

export default function NuevoDocumentoPage() {
  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar title="Documentos de Identificación" />
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-950">
        <DocumentoIdentificacionForm />
      </div>
    </div>
  )
}
