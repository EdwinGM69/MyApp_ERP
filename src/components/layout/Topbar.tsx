'use client'

import { useAuthStore } from '@/hooks/useAuth'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface TopbarProps {
  title: string
}

export default function Topbar({ title }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const { isOnline, pendingCount } = useOfflineSync()

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
        {!isOnline && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
            <span className="material-symbols-outlined text-sm">wifi_off</span>
            Sin conexión
            {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-64 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
          />
        </div>

        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>

        <a 
          href="/configuracion/empresa"
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Configuración"
        >
          <span className="material-symbols-outlined">settings</span>
        </a>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              {user?.nombre || 'Usuario'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 capitalize">
              {user?.rol || 'admin'}
            </p>
          </div>
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary">person</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
