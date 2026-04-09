'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import DocumentoIdentificacionModal from './DocumentoIdentificacionModal'

interface Documento {
  id: number
  descripcion: string
  abreviatura: string
}

interface DocumentoSelectProps {
  value?: number
  onSelect: (doc: Documento) => void
  disabled?: boolean
  className?: string
}

export default function DocumentoIdentificacionSelect({ value, onSelect, disabled, className }: DocumentoSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Documento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('Seleccione...')
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const fetchDocs = async () => {
    setLoading(true)
    setError(null)
    try {
      if (value && options.length === 0) {
        const idRes = await apiFetch(`/api/logistica/documentos-identificacion?id=${value}`)
        if (idRes.ok) {
          const idJson = await idRes.json()
          if (idJson.data) {
            setSelectedLabel(`${idJson.data.abreviatura} - ${idJson.data.descripcion}`)
          }
        }
      }

      const res = await apiFetch(`/api/logistica/documentos-identificacion?pageSize=200`)
      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Error al cargar documentos')
      }
      
      const list = Array.isArray(json.data) ? json.data : []
      setOptions(list)
      
      if (value) {
        const selected = list.find((d: Documento) => d.id === value)
        if (selected) setSelectedLabel(`${selected.abreviatura} - ${selected.descripcion}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  useEffect(() => {
    if (value && options.length > 0) {
      const selected = options.find(d => d.id === value)
      if (selected) setSelectedLabel(`${selected.abreviatura} - ${selected.descripcion}`)
    } else if (!value) {
      setSelectedLabel('Seleccione...')
    }
  }, [value, options])

  const handleToggle = () => {
    if (disabled) return
    if (options.length === 0 && !loading) {
      fetchDocs()
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (doc: Documento) => {
    setSelectedLabel(`${doc.abreviatura} - ${doc.descripcion}`)
    onSelect(doc)
    setIsOpen(false)
    setSearch('')
  }

  const handleModalSuccess = (newDoc: Documento) => {
    if (!newDoc || typeof newDoc.id === 'undefined') {
      console.error('[DocumentoIdentificacionSelect] Invalid document returned from modal:', newDoc)
      return
    }
    setOptions(prev => {
      const newList = [...prev, newDoc]
      return newList.sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''))
    })
    handleSelect(newDoc)
  }

  const filteredOptions = options.filter(opt => {
    const desc = (opt.descripcion || '').toLowerCase()
    const abbrev = (opt.abreviatura || '').toLowerCase()
    const s = search.toLowerCase()
    return desc.includes(s) || abbrev.includes(s)
  })

  const exactMatch = options.find(opt => 
    opt.descripcion.toLowerCase() === search.toLowerCase().trim() ||
    opt.abreviatura.toLowerCase() === search.toLowerCase().trim()
  )

  return (
    <>
      <div className={cn("relative", className)} ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none transition-all text-left flex items-center justify-between shadow-sm",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            selectedLabel === 'Seleccione...' ? "text-slate-400 font-normal italic font-medium uppercase tracking-widest text-[11px]" : "text-slate-900 dark:text-white font-bold"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate">{selectedLabel}</span>
          </div>
          <span className={cn(
            "material-symbols-outlined text-[20px] transition-transform text-slate-400",
            isOpen ? "rotate-180" : ""
          )}>
            expand_more
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[280px]">
            {/* Search Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar o crear tipo de documento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search && !exactMatch) {
                      e.preventDefault()
                      setIsModalOpen(true)
                      setIsOpen(false)
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold transition-all shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 custom-scrollbar">
              {loading && options.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined animate-spin text-blue-600 text-2xl">progress_activity</span>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest">Cargando catálogo...</p>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-[11px] text-red-500 font-black bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                  <span className="material-symbols-outlined text-base block mb-1">error</span>
                  {error}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                        value === option.id 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                          : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center transition-all",
                          value === option.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                        )}>
                          <span className={cn(
                            "material-symbols-outlined text-[16px]",
                            value === option.id ? "text-white" : "text-slate-400 group-hover:text-blue-600"
                          )}>badge</span>
                        </div>
                        <span className="truncate max-w-[160px]">{option.descripcion}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                        value === option.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 group-hover:text-blue-600"
                      )}>
                        {option.abreviatura}
                      </span>
                    </button>
                  ))}

                  {search && !exactMatch && (
                    <div className="mt-1 sticky bottom-0 bg-white dark:bg-slate-900 p-1 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(true)
                          setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-4 rounded-xl text-xs font-black text-blue-600 bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-dashed border-blue-200 dark:border-blue-500/30 flex items-center justify-between group transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-600 flex items-center justify-center text-blue-600 dark:text-white group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-sm">add</span>
                          </div>
                           <div className="flex flex-col">
                             <span className="leading-none">CREAR NUEVO</span>
                             <span className="text-[10px] opacity-70 mt-1 uppercase truncate max-w-[160px] font-bold">"{search.trim()}"</span>
                           </div>
                        </div>
                        <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 translate-x-1 transition-all">arrow_forward</span>
                      </button>
                    </div>
                  )}

                  {filteredOptions.length === 0 && !search && (
                    <div className="py-12 text-center">
                      <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800 shadow-inner">
                        <span className="material-symbols-outlined text-slate-300 text-3xl">badge</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-8">
                        No hay tipos de documentos registrados <br/> <span className="text-[10px] font-medium opacity-60">Utilice el buscador para agregar uno nuevo</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DocumentoIdentificacionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialDescription={search}
      />
    </>
  )
}
