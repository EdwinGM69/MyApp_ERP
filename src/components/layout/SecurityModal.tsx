'use client'

import { useAuthStore, apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Switch from '@/components/ui/Switch'
import toast from 'react-hot-toast'

interface SecurityModalProps {
  open: boolean
  onClose: () => void
}

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
}

function PasswordField({ label, value, onChange, show, onToggleShow }: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-blue-900/70 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 pr-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-blue-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/50 placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-blue-950 dark:hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function SecurityModal({ open, onClose }: SecurityModalProps) {
  const user = useAuthStore((s) => s.user)

  // Estado de campos de contraseña
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loading2FA, setLoading2FA] = useState(false)
  const [twoFactorLoaded, setTwoFactorLoaded] = useState(false)

  // Carga el estado actual de 2FA del usuario
  useEffect(() => {
    if (!open || !user?.id) return

    let cancelled = false
    const loadTwoFactor = async () => {
      try {
        const res = await apiFetch(`/api/usuarios/${user.id}`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled && json.data) {
          setTwoFactorEnabled(Boolean(json.data.two_factor_enabled))
          setTwoFactorLoaded(true)
        }
      } catch {
        setTwoFactorLoaded(false)
      }
    }

    loadTwoFactor()
    return () => {
      cancelled = true
    }
  }, [open, user?.id])

  // Limpiar campos al cerrar
  useEffect(() => {
    if (!open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open])

  if (!open) return null

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Completa todos los campos para cambiar la contraseña')
      return
    }
    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }

    setChangingPassword(true)
    try {
      const res = await apiFetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo cambiar la contraseña')
      }
      toast.success('Contraseña actualizada exitosamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleToggleTwoFactor = async (checked: boolean) => {
    if (!user?.id) return
    setLoading2FA(true)
    try {
      const res = await apiFetch(`/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ two_factor_enabled: checked }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo actualizar la verificación en dos pasos')
      }
      setTwoFactorEnabled(checked)
      toast.success(checked ? 'Verificación en dos pasos activada' : 'Verificación en dos pasos desactivada')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading2FA(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem]',
          'shadow-2xl shadow-black/20 border border-slate-100 dark:border-slate-800',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          'animate-in fade-in zoom-in-95 duration-200 ease-out'
        )}
      >
        {/* Encabezado */}
        <div className="px-7 pt-6 pb-0 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px] text-red-600 dark:text-red-400">
                shield
              </span>
            </div>
            <div>
              <h3 className="text-xl font-black text-blue-950 dark:text-white tracking-tight">
                Seguridad
              </h3>
              <p className="text-xs text-blue-900/60 dark:text-slate-400 font-medium">
                Cambia tu contraseña y gestiona el acceso a tu cuenta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-blue-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[22px] font-light">close</span>
          </button>
        </div>

        <div className="px-7 pb-7 pt-5 space-y-6">
          {/* Cambiar contraseña */}
          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="size-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg text-amber-600 dark:text-amber-400">lock</span>
              </span>
              <div>
                <h4 className="text-sm font-bold text-blue-950 dark:text-white">Cambiar contraseña</h4>
                <p className="text-xs text-blue-900/60 dark:text-slate-400">
                  Mínimo 8 caracteres. Usa una combinación segura.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <PasswordField
                label="Contraseña actual"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword((v) => !v)}
              />
              <PasswordField
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggleShow={() => setShowNewPassword((v) => !v)}
              />
              <PasswordField
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((v) => !v)}
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {changingPassword ? (
                  <>
                    <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">key</span>
                    Actualizar contraseña
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Verificación en dos pasos */}
          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-emerald-600 dark:text-emerald-400">verified_user</span>
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-blue-950 dark:text-white">Verificación en dos pasos</h4>
                  <p className="text-xs text-blue-900/60 dark:text-slate-400">
                    {twoFactorLoaded
                      ? (twoFactorEnabled
                          ? 'Tu cuenta está protegida con un segundo nivel de seguridad.'
                          : 'Añade una capa extra de seguridad al iniciar sesión.')
                      : 'Cargando estado...'}
                  </p>
                </div>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onChange={handleToggleTwoFactor}
                disabled={!twoFactorLoaded || loading2FA}
              />
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}