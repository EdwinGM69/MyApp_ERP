'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Sucursal {
  id: number
  descripcion: string
}

interface SucursalSelectProps {
  onSelect: (sucursal: Sucursal) => void
  placeholder?: string
  className?: string
  selectedLabel?: string
  selectedId?: number
}

export default function SucursalSelect({ onSelect, placeholder = 'Seleccionar sucursal...', className, selectedLabel, selectedId }: SucursalSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate position when opening
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [open])

  // Search sucursales
  useEffect(() => {
    const fetchSucursales = async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/empresa/sucursales?search=${search}`)
        const data = await res.json()
        setOptions(data || [])
      } catch (error) {
        console.error('Error searching sucursales:', error)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchSucursales, 300)
    return () => clearTimeout(timer)
  }, [search, open])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalDropdown = document.getElementById('sucursal-select-portal')
        if (portalDropdown && portalDropdown.contains(event.target as Node)) {
          return
        }
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full h-10 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs cursor-pointer hover:border-blue-500 transition-all group"
      >
        <span className={cn("truncate", !selectedLabel && "text-slate-400 italic font-medium")}>
          {selectedLabel || placeholder}
        </span>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 transition-colors">
          {open ? 'expand_less' : 'store'}
        </span>
      </div>

      {open && mounted && createPortal(
        <div 
          id="sucursal-select-portal"
          style={{ 
            position: 'absolute',
            top: coords.top + 8,
            left: coords.left,
            width: Math.max(coords.width, 280),
            zIndex: 9999
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar sucursal..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto py-2">
            {loading ? (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-2xl mb-2">progress_activity</span>
                <p className="text-[10px] uppercase font-black tracking-widest">Buscando...</p>
              </div>
            ) : options.length > 0 ? (
              options.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelect(s)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 hover:bg-blue-600 group cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 last:border-none"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-white tracking-tight uppercase leading-tight">
                    {s.descripcion}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">storefront</span>
                <p className="text-[10px] uppercase font-black tracking-widest">No se encontraron sucursales</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
