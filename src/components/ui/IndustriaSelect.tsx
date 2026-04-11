'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Industria {
  id: number
  descripcion: string
}

interface IndustriaSelectProps {
  value?: number
  onSelect: (industria: Industria) => void
  disabled?: boolean
  className?: string
}

export default function IndustriaSelect({ value, onSelect, disabled, className }: IndustriaSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Industria[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('Seleccione...')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchIndustrias = async () => {
    setLoading(true)
    setError(null)
    try {
      // First, if we have a value but no options, try to get the label for that ID
      if (value && options.length === 0) {
        const idRes = await apiFetch(`/api/logistica/industrias?id=${value}`)
        if (idRes.ok) {
          const idJson = await idRes.json()
          if (idJson.data) {
            setSelectedLabel(idJson.data.descripcion)
          }
        }
      }

      const res = await apiFetch(`/api/logistica/industrias?pageSize=200`)
      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Error al cargar industrias')
      }
      
      const list = Array.isArray(json.data) ? json.data : []
      setOptions(list)
      
      if (value) {
        const selected = list.find((i: Industria) => i.id === value)
        if (selected) setSelectedLabel(selected.descripcion)
      }
    } catch (err: any) {
      console.error('Error fetching industrias:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndustrias()
  }, [])

  useEffect(() => {
    if (value && options.length > 0) {
      const selected = options.find(i => i.id === value)
      if (selected) setSelectedLabel(selected.descripcion)
    } else if (!value) {
      setSelectedLabel('Seleccione...')
    }
  }, [value, options])

  const handleToggle = () => {
    if (disabled) return
    if (options.length === 0 && !loading) {
      fetchIndustrias()
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (industria: Industria) => {
    setSelectedLabel(industria.descripcion)
    onSelect(industria)
    setIsOpen(false)
    setSearch('')
  }

  const handleCreate = async () => {
    if (!search || creating) return
    setCreating(true)
    try {
      const res = await apiFetch('/api/logistica/industrias', {
        method: 'POST',
        body: JSON.stringify({ descripcion: search.trim(), activo: true })
      })
      const newInd = await res.json()
      
      if (!res.ok) throw new Error(newInd.error || 'Error al crear industria')
      
      toast.success(`Industria "${search.trim()}" creada`)
      
      // Update local state
      const created: Industria = { id: newInd.id, descripcion: newInd.descripcion }
      setOptions(prev => [...prev, created].sort((a, b) => a.descripcion.localeCompare(b.descripcion)))
      handleSelect(created)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filteredOptions = options.filter(opt => 
    opt.descripcion.toLowerCase().includes(search.toLowerCase())
  )

  const exactMatch = options.find(opt => 
    opt.descripcion.toLowerCase() === search.toLowerCase().trim()
  )

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none transition-all text-left flex items-center justify-between",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm",
          selectedLabel === 'Seleccione...' ? "text-slate-400" : "text-slate-900 dark:text-white"
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className={cn(
          "material-symbols-outlined text-[20px] transition-transform",
          isOpen ? "rotate-180" : ""
        )}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[240px]">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                autoFocus
                type="text"
                placeholder="Buscar o crear..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search && !exactMatch) {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
            {loading && options.length === 0 ? (
              <div className="p-4 text-center">
                <span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-[11px] text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-lg">
                <span className="material-symbols-outlined text-xs block mb-1">error</span>
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-tight",
                      value === option.id 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-600"
                    )}
                  >
                    {option.descripcion}
                  </button>
                ))}

                {search && !exactMatch && (
                  <button
                    type="button"
                    disabled={creating}
                    onClick={handleCreate}
                    className="w-full text-left px-4 py-3 rounded-lg text-xs font-black text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-dashed border-blue-200 dark:border-blue-800/50 mt-1 flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm group-hover:scale-125 transition-transform">add_circle</span>
                       <span>CREAR "{search.trim()}"</span>
                    </div>
                    {creating && <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>}
                  </button>
                )}

                {filteredOptions.length === 0 && !search && (
                  <div className="p-6 text-center text-[11px] text-slate-500 font-medium italic">
                    <span className="material-symbols-outlined text-base block mb-2 opacity-20">inventory_2</span>
                    No hay industrias registradas
                  </div>
                )}
                
                {filteredOptions.length === 0 && search && exactMatch && (
                  <div className="p-4 text-center text-[11px] text-slate-400 italic">
                    No hay coincidencias adicionales
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
