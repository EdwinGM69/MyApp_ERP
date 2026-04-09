'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Caja {
  id: number
  descripcion: string
  codigo: string
}

interface CajaSelectProps {
  onSelect: (caja: Caja) => void
  placeholder?: string
  className?: string
  selectedLabel?: string
  sucursalId?: number
}

export default function CajaSelect({ onSelect, placeholder = 'Seleccionar caja...', className, selectedLabel, sucursalId }: CajaSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Caja[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    const fetchCajas = async () => {
      if (!open) return
      setLoading(true)
      try {
        const url = sucursalId
          ? `/api/tesoreria/cajas?search=${search}&sucursalId=${sucursalId}`
          : `/api/tesoreria/cajas?search=${search}`
        const res = await apiFetch(url)
        const data = await res.json()
        setOptions(data?.data || [])
      } catch (error) {
        console.error('Error searching cajas:', error)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchCajas, 300)
    return () => clearTimeout(timer)
  }, [search, open, sucursalId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalDropdown = document.getElementById('caja-select-portal')
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
          {open ? 'expand_less' : 'account_balance_wallet'}
        </span>
      </div>

      {open && mounted && createPortal(
        <div
          id="caja-select-portal"
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
              placeholder="Buscar caja..."
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
              options.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelect(c)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 hover:bg-blue-600 group cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 last:border-none"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-white tracking-tight uppercase leading-tight">
                    {c.codigo} - {c.descripcion}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">point_of_sale</span>
                <p className="text-[10px] uppercase font-black tracking-widest">No se encontraron cajas</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
