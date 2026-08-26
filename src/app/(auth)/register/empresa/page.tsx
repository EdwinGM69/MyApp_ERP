'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/hooks/useAuth'
import OnboardingStepper from '@/components/onboarding/OnboardingStepper'

interface CatalogoItem {
  id: number
  descripcion: string
}

interface FormErrors {
  nombreEmpresa?: string
  tipoDocumento?: string
  numeroDocumento?: string
  industria?: string
}

function EmpresaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)

  // Nombre registrado en el formulario anterior (fallback si no hay sesión)
  const nombreUsuario = user?.nombre?.trim() || 'emprendedor'

  const [form, setForm] = useState({
    nombreEmpresa: '',
    tipoDocumento: '',
    numeroDocumento: '',
    industria: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [documentos, setDocumentos] = useState<CatalogoItem[]>([])
  const [industrias, setIndustrias] = useState<CatalogoItem[]>([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)

  useEffect(() => {
    async function cargarCatalogos() {
      setCargandoCatalogos(true)
      try {
        const [resDoc, resInd] = await Promise.all([
          fetch('/api/logistica/documentos-identificacion?pageSize=100'),
          fetch('/api/logistica/industrias?pageSize=100'),
        ])
        if (!resDoc.ok || !resInd.ok) throw new Error('Error al cargar los catálogos')
        const dataDoc = await resDoc.json()
        const dataInd = await resInd.json()
        setDocumentos(dataDoc.data || [])
        setIndustrias(dataInd.data || [])
      } catch (err) {
        console.error('[EMPRESA] Error cargando catálogos:', err)
        toast.error('No se pudieron cargar los catálogos. Recarga la página.')
      } finally {
        setCargandoCatalogos(false)
      }
    }
    cargarCatalogos()
  }, [])

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.nombreEmpresa.trim()) {
      errs.nombreEmpresa = 'El nombre de la empresa es requerido'
    } else if (form.nombreEmpresa.trim().length < 3) {
      errs.nombreEmpresa = 'El nombre debe tener al menos 3 caracteres'
    }
    if (!form.tipoDocumento) {
      errs.tipoDocumento = 'Seleccione un tipo de documento'
    }
    if (!form.numeroDocumento.trim()) {
      errs.numeroDocumento = 'El número de documento es requerido'
    } else if (!/^[A-Za-z0-9-]{5,20}$/.test(form.numeroDocumento.trim())) {
      errs.numeroDocumento =
        'Debe tener entre 5 y 20 caracteres alfanuméricos (guiones permitidos)'
    }
    if (!form.industria) {
      errs.industria = 'Seleccione una industria'
    }
    return errs
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/empresa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombreEmpresa.trim(),
          nif: form.numeroDocumento.trim(),
          industria_id: Number(form.industria),
          moneda_default: 'USD',
          zona_horaria: 'UTC',
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      let data: any = {}

      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        console.error('[EMPRESA] Respuesta no-JSON recibida:', res.status, text.substring(0, 300))
        throw new Error(`Error en el servidor (${res.status}). Por favor intente más tarde.`)
      }

      if (!res.ok) throw new Error(data.error || 'Error al guardar los datos de la empresa')

      toast.success('Datos de la empresa guardados')
      router.push('/register/sucursal')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full bg-slate-700 border text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed'
  const selectBase =
    'w-full bg-slate-700 border text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition appearance-none disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-6 justify-center">
        <div className="bg-primary rounded-xl p-2.5 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-xl font-bold leading-none">KAMAQ ONE</h1>
          <p className="text-slate-400 text-xs mt-0.5">Sistema de Gestión</p>
        </div>
      </div>

      {/* Stepper */}
      <OnboardingStepper currentStep={1} />

      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-white text-xl font-bold mb-1">
          ¡Hola, {nombreUsuario}! Cuéntanos sobre tu negocio.
        </h2>
        <p className="text-slate-400 text-sm">
          Esta información nos ayudará a configurar tu espacio de trabajo y adaptar las
          herramientas a tus necesidades específicas.
        </p>
      </div>

      {/* Card */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre de la empresa */}
          <div>
            <label htmlFor="nombreEmpresa" className="block text-sm font-medium text-slate-300 mb-1.5">
              Nombre de la empresa
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                business
              </span>
              <input
                id="nombreEmpresa"
                type="text"
                autoComplete="organization"
                value={form.nombreEmpresa}
                onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                placeholder="Mi Empresa SAC"
                className={`${inputBase} ${errors.nombreEmpresa ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.nombreEmpresa && (
              <p className="text-red-400 text-xs mt-1.5">{errors.nombreEmpresa}</p>
            )}
          </div>

          {/* Tipo de Documento */}
          <div>
            <label htmlFor="tipoDocumento" className="block text-sm font-medium text-slate-300 mb-1.5">
              Tipo de Documento
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
                badge
              </span>
              <select
                id="tipoDocumento"
                value={form.tipoDocumento}
                onChange={(e) => handleChange('tipoDocumento', e.target.value)}
                disabled={cargandoCatalogos}
                className={`${selectBase} ${errors.tipoDocumento ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              >
                <option value="">
                  {cargandoCatalogos ? 'Cargando...' : 'Seleccione un tipo de documento'}
                </option>
                {documentos.map((doc) => (
                  <option key={doc.id} value={String(doc.id)}>
                    {doc.descripcion}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
                expand_more
              </span>
            </div>
            {errors.tipoDocumento && (
              <p className="text-red-400 text-xs mt-1.5">{errors.tipoDocumento}</p>
            )}
          </div>

          {/* Número de documento */}
          <div>
            <label htmlFor="numeroDocumento" className="block text-sm font-medium text-slate-300 mb-1.5">
              Número de documento
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                tag
              </span>
              <input
                id="numeroDocumento"
                type="text"
                inputMode="numeric"
                value={form.numeroDocumento}
                onChange={(e) => handleChange('numeroDocumento', e.target.value)}
                placeholder="12345678"
                maxLength={20}
                className={`${inputBase} ${errors.numeroDocumento ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.numeroDocumento && (
              <p className="text-red-400 text-xs mt-1.5">{errors.numeroDocumento}</p>
            )}
          </div>

          {/* Industria / Giro del negocio */}
          <div>
            <label htmlFor="industria" className="block text-sm font-medium text-slate-300 mb-1.5">
              Industria / Giro del negocio
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
                factory
              </span>
              <select
                id="industria"
                value={form.industria}
                onChange={(e) => handleChange('industria', e.target.value)}
                disabled={cargandoCatalogos}
                className={`${selectBase} ${errors.industria ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              >
                <option value="">
                  {cargandoCatalogos ? 'Cargando...' : 'Seleccione una industria'}
                </option>
                {industrias.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.descripcion}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
                expand_more
              </span>
            </div>
            {errors.industria && (
              <p className="text-red-400 text-xs mt-1.5">{errors.industria}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                Procesando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                Continuar
              </>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="flex justify-center mt-6 pt-5 border-t border-slate-700">
          <Link
            href="/register/signup"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver
          </Link>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}

export default function EmpresaPage() {
  return (
    <Suspense fallback={null}>
      <EmpresaForm />
    </Suspense>
  )
}
