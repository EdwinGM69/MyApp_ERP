'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

import MaterialModal from './MaterialModal'

interface Material {
  id: number
  codigo: string
  descripcion: string
  unidad_medida?: string | null
  unidad_medida_rel?: { id: number, abreviatura: string }
}

interface MaterialSelectProps {
  onSelect: (material: any) => void
  placeholder?: string
  className?: string
  selectedLabel?: string
  excludeIds?: number[]
}

export default function MaterialSelect({ onSelect, placeholder = 'Seleccionar material...', className, selectedLabel, excludeIds }: MaterialSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
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

  // Update position on scroll/resize
  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        })
      }
    }
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  // Search materials
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/materiales?search=${search}&pageSize=10`)
        const json = await res.json()
        let fetchedData = json.data || []
        if (excludeIds && excludeIds.length > 0) {
          fetchedData = fetchedData.filter((m: Material) => !excludeIds.includes(m.id))
        }
        setOptions(fetchedData)
      } catch (error) {
        console.error('Error searching materiales:', error)
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
        // Only close if not clicking inside the portal dropdown
        const portalDropdown = document.getElementById('material-select-portal')
        if (portalDropdown && portalDropdown.contains(event.target as Node)) {
          return
        }
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleCreated = (newMaterial: any) => {
    onSelect(newMaterial)
    setOpen(false)
    setSearch('')
    setShowModal(false)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full h-8 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs cursor-pointer hover:border-blue-500 transition-all group"
      >
        <span className={cn("truncate tracking-tight", !selectedLabel && "text-slate-400 font-medium italic")}>
          {selectedLabel || placeholder}
        </span>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-lg">
          {open ? 'expand_less' : 'search'}
        </span>
      </div>

      {open && mounted && createPortal(
        <div 
          id="material-select-portal"
          style={{ 
            position: 'absolute',
            top: coords.top + 8,
            left: coords.left,
            width: Math.max(coords.width, 350),
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
              placeholder="Escriba código o descripción..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto py-2">
            {loading ? (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-2xl mb-2">progress_activity</span>
                <p className="text-[10px] uppercase font-black tracking-widest">Buscando materiales...</p>
              </div>
            ) : options.length > 0 ? (
              options.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelect(m)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 hover:bg-blue-600 group cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 last:border-none"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-white tracking-tight uppercase leading-tight">
                      {m.descripcion}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded group-hover:bg-blue-500 group-hover:text-white transition-colors uppercase">
                        {m.codigo}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-100 uppercase tracking-widest italic outline-none">
                        {m.unidad_medida || m.unidad_medida_rel?.abreviatura || 'UND'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : search ? (
              <div className="px-4 py-8 text-center">
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">No se encontró "{search}"</p>
                 <button
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation()
                     setShowModal(true)
                   }}
                   className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 mx-auto max-w-[200px]"
                 >
                   <span className="material-symbols-outlined text-sm">add</span>
                   Crear Material
                 </button>
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
                <p className="text-[10px] uppercase font-black tracking-widest">Escriba para buscar</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <MaterialModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleCreated}
        initialDescription={search}
      />
    </div>
  )
}
