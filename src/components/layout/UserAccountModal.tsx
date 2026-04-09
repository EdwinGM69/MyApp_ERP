'use client'

import { useAuthStore } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface UserAccountModalProps {
  open: boolean
  onClose: () => void
}

export default function UserAccountModal({ open, onClose }: UserAccountModalProps) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
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

  const forceLogout = useAuthStore((s) => s.forceLogout)

  const handleLogout = async () => {
    await forceLogout()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 px-4 sm:items-start sm:justify-end sm:pt-4 sm:pr-8 pointer-events-none">
      {/* Backdrop (invisible but clickable to close) */}
      <div className="fixed inset-0 bg-black/0 pointer-events-auto" onClick={onClose} />

      <div
        ref={modalRef}
        className={cn(
          "relative w-full max-w-sm bg-[#f8fafd] dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden pointer-events-auto",
          "animate-in fade-in zoom-in duration-200 ease-out"
        )}
      >
        {/* Header with Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-6 pb-6 flex flex-col items-center">
          <div className="relative mb-4 group cursor-pointer">
            <div className="size-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
              )}
            </div>
            {/* Camera Overlay Icon */}
            <div className="absolute bottom-0 right-0 size-7 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md ring-1 ring-slate-200 dark:ring-slate-700">
              <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-300">photo_camera</span>
            </div>
          </div>

          <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-6">
            {user?.email || 'usuario@ejemplo.com'}
          </h3>

          <button className="w-full py-2.5 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm">
            Gestionar tu cuenta
          </button>
        </div>

        {/* Activity Section */}
        <div className="px-4 py-2">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors text-left group">
            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">history</span>
            </div>
            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Ver historial de actividad
            </span>
            <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-0.5 transition-transform">
              chevron_right
            </span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar sesión
          </button>
          <button className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm">
            <span className="material-symbols-outlined text-lg">help</span>
            Ayuda
          </button>
        </div>

        {/* External Links */}
        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <a href="#" className="hover:underline">Política de privacidad</a>
          <span className="size-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <a href="#" className="hover:underline">Términos del servicio</a>
        </div>
      </div>
    </div>,
    document.body
  )
}
