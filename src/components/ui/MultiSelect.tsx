'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Option {
  id: number
  codigo?: string
  descripcion: string
  abreviatura?: string | null
}

interface MultiSelectProps {
  endpoint: string
  values: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  className?: string
  searchPlaceholder?: string
  labelKey?: keyof Option
  sublabelKey?: keyof Option
}

export default function MultiSelect({
  endpoint,
  values,
  onChange,
  placeholder = 'Seleccionar...',
  className,
  searchPlaceholder = 'Buscar...',
  labelKey = 'descripcion',
  sublabelKey = 'codigo',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOptions = options.filter((o) => values.includes(o.id))

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, pageSize: '20' })
      const res = await apiFetch(`${endpoint}?${params}`)
      const json = await res.json()
      const fetched = json.data || []
      setOptions((prev) => {
        const existingIds = new Set(prev.map((o) => o.id))
        const merged = [...prev, ...fetched.filter((o: Option) => !existingIds.has(o.id))]
        return merged
      })
    } catch (error) {
      console.error('[MultiSelect] Error fetching:', error)
    } finally {
      setLoading(false)
    }
  }, [endpoint, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) fetchOptions()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, open, fetchOptions])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isSelected = (id: number) => values.includes(id)

  const toggleOption = (id: number) => {
    if (isSelected(id)) {
      onChange(values.filter((v) => v !== id))
    } else {
      onChange([...values, id])
    }
  }

  const removeValue = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    onChange(values.filter((v) => v !== id))
  }

  const label = (opt: Option) => String(opt[labelKey as keyof Option] ?? '')
  const sublabel = (opt: Option) => sublabelKey ? String(opt[sublabelKey as keyof Option] ?? '') : ''

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        onClick={() => setOpen(!open)}
        className="w-full min-h-[44px] px-3 py-2 flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm"
      >
        {values.length > 0 ? (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-semibold"
            >
              {label(opt)}
              <span
                onClick={(e) => removeValue(e, opt.id)}
                className="cursor-pointer hover:text-red-500 transition-colors material-symbols-outlined text-[14px]"
              >
                close
              </span>
            </span>
          ))
        ) : (
          <span className="text-slate-400 font-medium italic">{placeholder}</span>
        )}
        <span className="material-symbols-outlined text-slate-400 ml-auto text-lg shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {loading && options.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-2xl mb-2">progress_activity</span>
                <p className="text-[10px] uppercase font-black tracking-widest">Buscando...</p>
              </div>
            ) : options.length > 0 ? (
              options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-b border-slate-50 dark:border-slate-800/50 last:border-none",
                    isSelected(opt.id) && "bg-indigo-50/50 dark:bg-indigo-500/5"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                    isSelected(opt.id)
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-slate-300 dark:border-slate-600"
                  )}>
                    {isSelected(opt.id) && (
                      <span className="material-symbols-outlined text-white text-[12px]">check</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-[12px] font-semibold leading-tight",
                      isSelected(opt.id)
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300"
                    )}>
                      {label(opt)}
                    </span>
                    {sublabel && (
                      <span className="text-[9px] font-mono text-slate-400">{sublabel(opt)}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-30">search_off</span>
                <p className="text-[10px] uppercase font-black tracking-widest">Sin resultados</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
