'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Ubicacion {
  id: number
  codigo: string
  descripcion: string
}

interface UbicacionSelectProps {
  value?: number | null
  onChange: (id: number | undefined) => void
  placeholder?: string
  className?: string
}

export default function UbicacionSelect({ value, onChange, placeholder = 'seleccionar ubicación', className }: UbicacionSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUbicacion, setSelectedUbicacion] = useState<Ubicacion | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch initial selected ubicacion
  useEffect(() => {
    if (value && (!selectedUbicacion || selectedUbicacion.id !== value)) {
      async function fetchSelected() {
        try {
          // Assuming the API supports fetching by ID, otherwise it will be in the initial load
          const res = await apiFetch(`/api/logistica/ubicaciones?id=${value}`)
          const json = await res.json()
          if (json.data && Array.isArray(json.data)) {
            // If it returns a list, find the one
            const found = json.data.find((u: any) => u.id === value)
            if (found) setSelectedUbicacion(found)
          } else if (json.data) {
            setSelectedUbicacion(json.data)
          }
        } catch (error) {
          console.error('[UbicacionSelect] Error fetching selected ubicacion:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedUbicacion(null)
    }
  }, [value, selectedUbicacion?.id])

  // Search ubicaciones
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/logistica/ubicaciones?search=${search}&pageSize=10`)
        const json = await res.json()
        setOptions(json.data || [])
      } catch (error) {
        console.error('Error searching ubicaciones:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open])

  // Click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex flex-col">
          <span className={cn("leading-tight", selectedUbicacion ? "text-slate-900 dark:text-white" : "text-slate-500")}>
            {selectedUbicacion ? selectedUbicacion.descripcion : placeholder}
          </span>
          {selectedUbicacion && (
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedUbicacion.codigo}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
           {selectedUbicacion && (
             <button 
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 onChange(undefined);
                 setSelectedUbicacion(null);
               }}
               className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center"
             >
               <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
             </button>
           )}
           <span className="material-symbols-outlined text-slate-500 group-hover:text-blue-400 transition-colors">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ubicación..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto pt-1 pb-1">
            {loading && options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Buscando...
              </div>
            ) : options.length > 0 ? (
              options.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onChange(u.id)
                    setSelectedUbicacion(u)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">{u.descripcion}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-200 font-mono tracking-tight">{u.codigo}</span>
                  </div>
                  {selectedUbicacion?.id === u.id && (
                     <span className="material-symbols-outlined text-blue-500 group-hover:text-white text-sm">check_circle</span>
                  )}
                </div>
              ))
            ) : search ? (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-slate-500 font-medium">No se encontró "{search}"</p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-slate-600 text-[32px] mb-2 font-variation-icon">search_off</span>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Escriba para buscar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
