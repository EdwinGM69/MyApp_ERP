'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

import MarcaModal from './MarcaModal'

interface Marca {
  id: number
  codigo: string
  descripcion: string
  abreviatura?: string | null
}

interface MarcaSelectProps {
  value?: number
  onChange: (id: number | undefined) => void
  placeholder?: string
  className?: string
}

export default function MarcaSelect({ value, onChange, placeholder = 'asignar marca', className }: MarcaSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Marca[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch initial selected marca if value exists
  useEffect(() => {
    // Only fetch if we don't have the selected marca or the ID doesn't match
    if (value && (!selectedMarca || selectedMarca.id !== value)) {
      async function fetchSelected() {
        console.log('[MarcaSelect] Fetching selected ID:', value)
        try {
          const res = await apiFetch(`/api/marcas?id=${value}`)
          const json = await res.json()
          console.log('[MarcaSelect] Fetch result:', json.data)
          if (json.data) setSelectedMarca(json.data)
        } catch (error) {
          console.error('[MarcaSelect] Error fetching selected marca:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedMarca(null)
    }
  }, [value, selectedMarca?.id])

  // Search brands
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/marcas?search=${search}&pageSize=10`)
        const json = await res.json()
        setOptions(json.data || [])
      } catch (error) {
        console.error('Error searching marcas:', error)
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

  const onMarcaCreated = (newMarca: Marca) => {
    console.log('[MarcaSelect] onMarcaCreated received:', newMarca)
    setSelectedMarca(newMarca)
    setOptions(prev => [newMarca, ...prev]) // Ensure it appears in the list
    onChange(newMarca.id)
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
        <span className={cn(selectedMarca ? "text-white" : "text-slate-500")}>
          {selectedMarca ? selectedMarca.descripcion : placeholder}
        </span>
        <span className="material-symbols-outlined text-slate-500 group-hover:text-blue-400 transition-colors">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar marca..."
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
              options.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onChange(m.id)
                    setSelectedMarca(m)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <span className="font-bold">{m.descripcion}</span>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-200">{m.codigo}</span>
                </div>
              ))
            ) : search ? (
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-slate-500 mb-3 font-medium">No se encontró "{search}"</p>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
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

      <MarcaModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onMarcaCreated}
        initialDescription={search}
      />
    </div>
  )
}
