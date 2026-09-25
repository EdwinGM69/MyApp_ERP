'use client'

interface ImportingOverlayProps {
  label?: string
  count?: number
  icon?: string
}

export default function ImportingOverlay({
  label = 'Procesando importación',
  count,
  icon = 'inventory_2',
}: ImportingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700 px-8 py-7 flex flex-col items-center gap-5 max-w-sm w-full">
        <div className="relative">
          <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary animate-pulse text-2xl">{icon}</span>
          </div>
        </div>

        <div className="text-center">
          <p className="font-black text-slate-900 dark:text-white tracking-tight">{label}</p>
          <p className="text-sm text-slate-500 mt-1.5">
            {count
              ? `Creando ${count} registro(s) masivamente…`
              : 'Esto puede tomar unos segundos…'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary animate-bounce" />
          <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}