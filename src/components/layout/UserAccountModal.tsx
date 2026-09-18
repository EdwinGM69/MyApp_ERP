'use client'

import { useAuthStore } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface UserAccountModalProps {
  open: boolean
  onClose: () => void
}

interface MenuEntry {
  id: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  desc: string
}

const MENU: MenuEntry[] = [
  {
    id: 'cuenta',
    icon: 'person',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Gestionar tu cuenta',
    desc: 'Datos personales, rol y acceso',
  },
  {
    id: 'historial',
    icon: 'history',
    iconBg: 'bg-purple-100 dark:bg-purple-500/15',
    iconColor: 'text-purple-600 dark:text-purple-400',
    title: 'Ver historial de actividad',
    desc: 'Revisa tu actividad en el sistema',
  },
  {
    id: 'preferencias',
    icon: 'verified_user',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Preferencias',
    desc: 'Notificaciones, idioma y apariencia',
  },
  {
    id: 'ayuda',
    icon: 'help',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-500 dark:text-violet-400',
    title: 'Ayuda',
    desc: 'Centro de soporte y preguntas frecuentes',
  },
]

/** Iniciales para el avatar: "Kgabancho" → "KG", "Juan Pérez" → "JP" */
function iniciales(nombre?: string): string {
  if (!nombre) return '??'
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return partes[0].slice(0, 2).toUpperCase()
}

export default function UserAccountModal({ open, onClose }: UserAccountModalProps) {
  const user = useAuthStore((s) => s.user)
  const forceLogout = useAuthStore((s) => s.forceLogout)
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  const handleLogout = async () => {
    await forceLogout()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 px-4 sm:justify-end sm:pt-5 sm:pr-8 pointer-events-none">
      {/* Fondo con degradado pastel difuminado */}
      <div
        className="fixed inset-0 pointer-events-auto bg-gradient-to-br from-white/50 via-sky-50/60 to-rose-50/60 backdrop-blur-sm dark:from-slate-950/60 dark:via-slate-900/70 dark:to-slate-950/60"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem]',
          'shadow-2xl shadow-slate-900/10 dark:shadow-black/50 border border-slate-100 dark:border-slate-800',
          'pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto',
          'animate-in fade-in zoom-in-95 duration-200 ease-out'
        )}
      >
        {/* Encabezado: cerrar */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-blue-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[22px] font-light">close</span>
          </button>
        </div>

        {/* Sección de perfil */}
        <div className="px-6 pb-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="size-20 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold tracking-wide">
                  {iniciales(user?.nombre)}
                </span>
              )}
            </div>
            <button
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Cambiar foto"
            >
              <span className="material-symbols-outlined text-[15px]">photo_camera</span>
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-blue-950 dark:text-white leading-tight truncate">
              {user?.nombre || 'Usuario'}
            </h3>
            <p className="text-sm text-blue-900/70 dark:text-slate-400 truncate">
              {user?.email || ''}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                En línea
              </span>
            </span>
          </div>
        </div>

        {/* Cuerpo del menú */}
        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'cuenta') {
                    onClose()
                    if (user?.id) router.push(`/usuarios?userId=${user.id}`)
                  }
                }}
                className="w-full flex items-center gap-3.5 px-3.5 py-3.5 hover:bg-white dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <span className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', item.iconBg)}>
                  <span className={cn('material-symbols-outlined text-xl', item.iconColor)}>
                    {item.icon}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-blue-950 dark:text-white truncate">
                    {item.title}
                  </span>
                  <span className="block text-xs text-blue-900/60 dark:text-slate-400 truncate">
                    {item.desc}
                  </span>
                </span>
                <span className="material-symbols-outlined text-lg text-blue-900/50 dark:text-slate-500 shrink-0">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cerrar sesión */}
        <div className="px-6 pb-4 pt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar sesión
          </button>
        </div>

        {/* Pie de página */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-blue-900/60 dark:text-slate-500">
          <span className="material-symbols-outlined text-sm">shield</span>
          <a href="#" className="hover:text-blue-950 dark:hover:text-slate-300 transition-colors">
            Política de privacidad
          </a>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <a href="#" className="hover:text-blue-950 dark:hover:text-slate-300 transition-colors">
            Términos del servicio
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}
