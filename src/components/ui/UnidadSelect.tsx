'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import UnidadModal from './UnidadSelectModal'

interface UnidadMedida {
  id: number
  descripcion: string
  abreviatura: string
}

interface UnidadSelectProps {
  value?: number
  onChange: (id: number | undefined, abreviatura?: string) => void
  placeholder?: string
  className?: string
  materialId?: number
  enabled?: boolean
}

export default function UnidadSelect({ value, onChange, placeholder = 'seleccionar unidad', className, materialId, enabled = true }: UnidadSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<UnidadMedida[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadMedida | null>(null)
  const [showModal, setShowModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch initial selected unidad
  useEffect(() => {
    if (value && (!selectedUnidad || selectedUnidad.id !== value)) {
      async function fetchSelected() {
        try {
          const res = await apiFetch(`/api/logistica/unidades?id=${value}`)
          const json = await res.json()
          if (json.data) setSelectedUnidad(json.data)
        } catch (error) {
          console.error('[UnidadSelect] Error fetching selected unit:', error)
        }
      }
      fetchSelected()
    } else if (!value) {
      setSelectedUnidad(null)
    }
  }, [value, selectedUnidad?.id])

  // Reset when material changes
  useEffect(() => {
    if (materialId && value) {
      async function validateUnidadInMaterial() {
        try {
          const res = await apiFetch(`/api/materiales/presentaciones?materialId=${materialId}&pageSize=50`)
          const json = await res.json()
          const presentaciones = json.data || []
          const found = presentaciones.find((p: any) => p.unidad_medida_id === value)
          if (!found) {
            setSelectedUnidad(null)
            onChange(undefined)
          }
        } catch (error) {
          console.error('[UnidadSelect] Error validating unidad for material:', error)
        }
      }
      if (enabled) validateUnidadInMaterial()
    }
  }, [materialId])

  // Search units
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!open || !enabled) return
      setLoading(true)
      try {
        let res
        if (materialId) {
          res = await apiFetch(`/api/materiales/presentaciones?materialId=${materialId}&pageSize=20`)
          const json = await res.json()
          const presentaciones = json.data || []
          const normalized = presentaciones.map((p: any) => ({
            id: p.unidad_medida_id,
            descripcion: p.unidad_medida?.descripcion || '',
            abreviatura: p.unidad_medida?.abreviatura || ''
          }))
          setOptions(normalized)
        } else {
          res = await apiFetch(`/api/logistica/unidades?search=${search}&pageSize=10`)
          const json = await res.json()
          setOptions(json.data || [])
        }
      } catch (error) {
        console.error('Error searching units:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open, materialId, enabled])

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

  const onUnidadCreated = (newUnidad: UnidadMedida) => {
    setSelectedUnidad(newUnidad)
    setOptions(prev => [newUnidad, ...prev])
    onChange(newUnidad.id, newUnidad.abreviatura)
    setShowModal(false)
    setSearch('')
    setOpen(false)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full h-8 px-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer flex items-center justify-between group"
      >
        <span className={cn(selectedUnidad ? "text-slate-900 dark:text-white" : "text-slate-500")}>
          {selectedUnidad ? `${selectedUnidad.descripcion} (${selectedUnidad.abreviatura})` : placeholder}
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
              placeholder="Buscar unidad..."
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
                    onChange(u.id, u.abreviatura)
                    setSelectedUnidad(u)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <span className="font-bold">{u.descripcion}</span>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-200">{u.abreviatura}</span>
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

      <UnidadModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onUnidadCreated}
        initialDescription={search}
      />
    </div>
  )
}
