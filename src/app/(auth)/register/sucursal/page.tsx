'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import OnboardingStepper from '@/components/onboarding/OnboardingStepper'

interface FormErrors {
  nombreSucursal?: string
  direccion?: string
  celular?: string
}

export default function SucursalPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nombreSucursal: '',
    direccion: '',
    celular: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.nombreSucursal.trim()) {
      errs.nombreSucursal = 'El nombre de la sucursal es requerido'
    } else if (form.nombreSucursal.trim().length < 3) {
      errs.nombreSucursal = 'El nombre debe tener al menos 3 caracteres'
    }
    if (!form.direccion.trim()) {
      errs.direccion = 'La dirección física es requerida'
    } else if (form.direccion.trim().length < 5) {
      errs.direccion = 'La dirección debe tener al menos 5 caracteres'
    }
    if (form.celular.trim() && !/^\+?[0-9\s-]{9,15}$/.test(form.celular.trim())) {
      errs.celular =
        'Ingrese un número válido (9 a 15 dígitos, puede incluir + y espacios)'
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
      const res = await fetch('/api/register/sucursal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreSucursal: form.nombreSucursal.trim(),
          direccion: form.direccion.trim(),
          celular: form.celular.trim(),
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      let data: any = {}

      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        console.error('[SUCURSAL] Respuesta no-JSON recibida:', res.status, text.substring(0, 300))
        throw new Error(`Error en el servidor (${res.status}). Por favor intente más tarde.`)
      }

      if (!res.ok) throw new Error(data.error || 'Error al guardar los datos de la sucursal')

      toast.success('¡Sucursal registrada!')
      // Siguiente paso: formulario final del onboarding
      router.push('/register/final')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full bg-slate-700 border text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed'

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
      <OnboardingStepper currentStep={2} />

      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-white text-xl font-bold mb-1">
          ¿Dónde está ubicada tu primera sucursal?
        </h2>
        <p className="text-slate-400 text-sm">
          Configura los detalles de tu ubicación principal para comenzar a operar.
        </p>
      </div>

      {/* Card */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre de la Sucursal */}
          <div>
            <label htmlFor="nombreSucursal" className="block text-sm font-medium text-slate-300 mb-1.5">
              Nombre de la Sucursal
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                storefront
              </span>
              <input
                id="nombreSucursal"
                type="text"
                value={form.nombreSucursal}
                onChange={(e) => handleChange('nombreSucursal', e.target.value)}
                placeholder="Sucursal Principal"
                className={`${inputBase} ${errors.nombreSucursal ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.nombreSucursal && (
              <p className="text-red-400 text-xs mt-1.5">{errors.nombreSucursal}</p>
            )}
          </div>

          {/* Dirección física */}
          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-slate-300 mb-1.5">
              Dirección física
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                location_on
              </span>
              <input
                id="direccion"
                type="text"
                autoComplete="street-address"
                value={form.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                placeholder="Calle, Número, Ciudad"
                className={`${inputBase} ${errors.direccion ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.direccion && (
              <p className="text-red-400 text-xs mt-1.5">{errors.direccion}</p>
            )}
          </div>

          {/* Número de celular del negocio (Opcional) */}
          <div>
            <label htmlFor="celular" className="block text-sm font-medium text-slate-300 mb-1.5">
              Número de celular del negocio <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                smartphone
              </span>
              <input
                id="celular"
                type="tel"
                autoComplete="tel"
                value={form.celular}
                onChange={(e) => handleChange('celular', e.target.value)}
                placeholder="+51 999 999 999"
                maxLength={16}
                className={`${inputBase} ${errors.celular ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.celular ? (
              <p className="text-red-400 text-xs mt-1.5">{errors.celular}</p>
            ) : (
              <p className="text-slate-500 text-xs mt-1.5">
                Recomendamos usar un número con WhatsApp activo.
              </p>
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
                <span className="material-symbols-outlined text-xl">check_circle</span>
                ¡Listo, entrar al sistema!
              </>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="flex justify-center mt-6 pt-5 border-t border-slate-700">
          <Link
            href="/register/empresa"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al paso 1
          </Link>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}
