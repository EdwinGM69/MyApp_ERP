'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import PaisModal from './PaisModal'

export interface Pais {
  id: number
  descripcion: string
  abreviatura: string
}

export default function PaisSelect({ value, onChange, placeholder = 'Seleccionar país', className, disabled = false }: {
  value?: number
  onChange: (pais: Pais | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Pais[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPais, setSelectedPais] = useState<Pais | null>(null)
  
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down')
  const [showModal, setShowModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value && (!selectedPais || selectedPais.id !== value)) {
      async function fetchSelected() {
        try {
          const res = await apiFetch(`/api/logistica/paises?id=${value}`)
          const json = await res.json()
          if (json.data) {
            setSelectedPais(json.data)
            onChange(json.data)
          }
        } catch (error) {
          console.error('[PaisSelect] Error:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedPais(null)
    }
  }, [value, selectedPais?.id])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/logistica/paises?search=${search}&pageSize=10&activo=true`)
        const json = await res.json()
        setOptions(json.data || [])
      } catch (error) {
        console.error('Error searching paises:', error)
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

  const onPaisCreated = (newPais: Pais) => {
    setSelectedPais(newPais)
    setOptions(prev => [newPais, ...prev])
    onChange(newPais)
    setShowModal(false)
    setSearch('')
    setOpen(false)
  }

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
          "w-full px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all flex items-center justify-between group h-[42px]",
          disabled 
            ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed" 
            : "border-slate-200 dark:border-slate-700 cursor-pointer"
        )}
      >
        <span className={cn(selectedPais ? "text-slate-900 dark:text-white" : "text-slate-400")}>
          {selectedPais ? selectedPais.descripcion : placeholder}
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
              placeholder="Buscar país..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {loading && options.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-500 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Cargando...
              </div>
            ) : options.length > 0 ? (
              options.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p)
                    setSelectedPais(p)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl cursor-pointer transition-all flex flex-col group"
                >
                  <span className="font-black tracking-tight">{p.descripcion}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100">{p.abreviatura}</span>
                </div>
              ))
            ) : search ? (
              <div className="p-2">
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-widest">Sin resultados</p>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Crear "{search}"
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[40px] mb-3">public</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escriba para buscar país</p>
              </div>
            )}
          </div>
        </div>
      )}

      <PaisModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onPaisCreated}
        initialDescription={search}
      />
    </div>
  )
}
