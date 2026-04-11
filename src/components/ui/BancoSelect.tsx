'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export interface Banco {
  id: number
  codigo: string
  descripcion: string
  codigo_swift?: string
  pais?: {
    descripcion: string
    abreviatura: string
  }
  tipos_cuenta?: {
    id: number
    descripcion: string
  }[]
}

export default function BancoSelect({ value, onChange, placeholder = 'Seleccionar banco', className, disabled = false }: {
  value?: number
  onChange: (banco: Banco | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Banco[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null)
  
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value && (!selectedBanco || selectedBanco.id !== value)) {
      async function fetchSelected() {
        try {
          const res = await apiFetch(`/api/tesoreria/bancos?id=${value}`)
          const json = await res.json()
          if (json.data) {
            setSelectedBanco(json.data)
            onChange(json.data)
          }
        } catch (error) {
          console.error('[BancoSelect] Error:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedBanco(null)
    }
  }, [value, selectedBanco?.id])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/tesoreria/bancos?search=${search}&pageSize=10`)
        const json = await res.json()
        setOptions(json.data || [])
      } catch (error) {
        console.error('Error searching bancos:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!disabled) {
      if (!open && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        setDropdownDirection(spaceBelow < 380 ? 'up' : 'down')
      }
      setOpen(!open)
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={handleToggle}
        className={cn(
          "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all flex items-center justify-between group h-[42px]",
          disabled 
            ? "bg-slate-100 dark:bg-slate-950 text-slate-500 cursor-not-allowed" 
            : "cursor-pointer"
        )}
      >
        <span className={cn(selectedBanco ? "text-slate-900 dark:text-white" : "text-slate-400")}>
          {selectedBanco ? `${selectedBanco.codigo} - ${selectedBanco.descripcion}` : placeholder}
        </span>
        {!disabled && (
          <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 transition-colors">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </div>

      {open && !disabled && (
        <div className={cn(
          "absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          dropdownDirection === 'up' ? "bottom-full mb-2" : "top-full mt-2"
        )}>
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar banco..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {loading && options.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-500 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-center">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Cargando...
              </div>
            ) : options.length > 0 ? (
              options.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onChange(b)
                    setSelectedBanco(b)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="font-black tracking-tight">{b.descripcion}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100">{b.codigo}</span>
                  </div>
                  {b.pais?.abreviatura && (
                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      {b.pais.abreviatura}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[40px] mb-3">account_balance</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {search ? 'Sin resultados' : 'Escriba para buscar banco'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
