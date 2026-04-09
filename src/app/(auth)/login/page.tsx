'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
      setAuth(data.accessToken, data.user)
      toast.success('Bienvenido, ' + data.user.nombre)
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary rounded-xl p-2.5 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">point_of_sale</span>
        </div>
        <div>
          <h1 className="text-white text-xl font-bold leading-none">ERP/POS Pro</h1>
          <p className="text-slate-400 text-xs mt-0.5">Sistema de Gestión Empresarial</p>
        </div>
      </div>

      <h2 className="text-white text-2xl font-bold mb-1">Iniciar Sesión</h2>
      <p className="text-slate-400 text-sm mb-6">Ingresa tus credenciales para continuar</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              mail
            </span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@empresa.com"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              lock
            </span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-400">Recordar sesión</span>
          </label>
          <a href="/forgot-password" className="text-sm text-primary hover:text-blue-400 transition-colors">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              Iniciando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">login</span>
              Iniciar Sesión
            </>
          )}
        </button>
      </form>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}
