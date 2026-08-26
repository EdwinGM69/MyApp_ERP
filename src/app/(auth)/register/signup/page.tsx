'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/hooks/useAuth'

type PlanId = 'free' | 'monthly' | 'annual'

interface FormErrors {
  nombre?: string
  email?: string
  password?: string
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)

  const plan = (searchParams.get('plan') || 'free') as PlanId

  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.nombre.trim()) {
      errs.nombre = 'El nombre completo es requerido'
    } else if (form.nombre.trim().length < 3) {
      errs.nombre = 'El nombre debe tener al menos 3 caracteres'
    }
    if (!form.email.trim()) {
      errs.email = 'El correo electrónico es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Correo electrónico inválido'
    }
    if (!form.password) {
      errs.password = 'La contraseña es requerida'
    } else if (form.password.length < 8) {
      errs.password = 'La contraseña debe tener al menos 8 caracteres'
    }
    return errs
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  async function handleEmailBlur() {
    const email = form.email.toLowerCase().trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    setCheckingEmail(true)
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.exists) {
        setErrors((prev) => ({ ...prev, email: 'Este correo ya está registrado' }))
      }
    } catch {
      // Silent: submit-time validation covers failures
    } finally {
      setCheckingEmail(false)
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.toLowerCase().trim(),
          password: form.password,
          plan,
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      let data: any = {}

      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        console.error('[SIGNUP] Respuesta no-JSON recibida:', res.status, text.substring(0, 300))
        throw new Error(`Error en el servidor (${res.status}). Por favor intente más tarde.`)
      }

      if (!res.ok) throw new Error(data.error || 'Error al registrar la cuenta')

      setAuth(data.accessToken, data.user)
      toast.success('¡Cuenta creada con éxito!')
      // Continuar → formulario posterior de llenado de datos
      router.push(`/register/empresa?plan=${plan}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full bg-slate-700 border text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition'

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

      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-white text-xl font-bold mb-1">
          Comienza a gestionar tu negocio hoy
        </h2>
        <p className="text-slate-400 text-sm">Gratis 14 días. Sin tarjeta de crédito.</p>
      </div>

      {/* Card */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre completo */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-slate-300 mb-1.5">
              Nombre completo
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                person
              </span>
              <input
                id="nombre"
                type="text"
                autoComplete="name"
                value={form.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Juan Pérez"
                className={`${inputBase} ${errors.nombre ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'}`}
              />
            </div>
            {errors.nombre && (
              <p className="text-red-400 text-xs mt-1.5">{errors.nombre}</p>
            )}
          </div>

          {/* Correo electrónico */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="tu@empresa.com"
                className={`${inputBase} ${errors.email ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-600 focus:ring-primary'} ${checkingEmail ? 'pr-10' : 'pr-4'}`}
              />
              {checkingEmail && (
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg animate-spin"
                  aria-label="Verificando correo"
                >
                  progress_activity
                </span>
              )}
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                lock
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={`${inputBase} ${errors.password ? 'border-red-500/60 pr-10 focus:ring-red-500' : 'border-slate-600 pr-10 focus:ring-primary'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>
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
                Creando cuenta...
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
            href="/register"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Elegir otro plan
          </Link>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
