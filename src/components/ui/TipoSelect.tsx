'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import TipoModal from './TipoModal'

interface Tipo {
  id: number
  codigo: string
  descripcion: string
}

interface TipoSelectProps {
  value?: number
  onChange: (id: number | undefined) => void
  placeholder?: string
  className?: string
}

export default function TipoSelect({ value, onChange, placeholder = 'Seleccionar tipo', className }: TipoSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Tipo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<Tipo | null>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch initial selected tipo if value exists
  useEffect(() => {
    if (value && (!selectedTipo || selectedTipo.id !== value)) {
      async function fetchSelected() {
        try {
          const res = await apiFetch(`/api/materiales/tipos?id=${value}`)
          const json = await res.json()
          if (json.data) setSelectedTipo(json.data)
        } catch (error) {
          console.error('[TipoSelect] Error fetching selected tipo:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedTipo(null)
    }
  }, [value, selectedTipo?.id])

  // Search tipos
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/materiales/tipos?search=${search}&pageSize=10`)
        const json = await res.json()
        setOptions(json.data || [])
      } catch (error) {
        console.error('Error searching tipos:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onTipoCreated = (newTipo: Tipo) => {
    setSelectedTipo(newTipo)
    setOptions(prev => [newTipo, ...prev])
    onChange(newTipo.id)
    setShowModal(false)
    setSearch('')
    setOpen(false)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer flex items-center justify-between group"
      >
        <span className={cn(selectedTipo ? "text-white" : "text-slate-500")}>
          {selectedTipo ? selectedTipo.descripcion : placeholder}
        </span>
        <span className="material-symbols-outlined text-slate-500 group-hover:text-blue-400 transition-colors">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-slate-600 bg-[#2a3441]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tipo..."
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto pt-1 pb-1">
            {loading && options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Buscando...
              </div>
            ) : options.length > 0 ? (
              options.map((tipo) => (
                <div
                  key={tipo.id}
                  onClick={() => {
                    onChange(tipo.id)
                    setSelectedTipo(tipo)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-2 text-sm text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <span>{tipo.descripcion}</span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-200">{tipo.codigo}</span>
                </div>
              ))
            ) : search ? (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-slate-500 mb-3 font-medium">No se encontró "{search}"</p>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Crear "{search}"
                </button>
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

      <TipoModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onTipoCreated}
        initialDescription={search}
      />
    </div>
  )
}
