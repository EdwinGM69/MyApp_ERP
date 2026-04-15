'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/hooks/useAuth'
import { useSucursal } from '@/contexts/SucursalContext'
import { cn } from '@/lib/utils'

interface Sucursal {
  id: number
  descripcion: string
  activo: boolean
}

interface UserSucursalSelectProps {
  className?: string
}

export default function UserSucursalSelect({ className }: UserSucursalSelectProps) {
  const { userSucursales, currentSucursal, setCurrentSucursal, hasSucursales } = useSucursal()
  const [open, setOpen] = useState(false)
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

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalDropdown = document.getElementById('user-sucursal-select-portal')
        if (portalDropdown && portalDropdown.contains(event.target as Node)) {
          return
        }
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Handle sucursal change
  const handleSelect = async (sucursal: Sucursal) => {
    try {
      const sucursalWithActivo: Sucursal = {
        ...sucursal,
        activo: sucursal.activo ?? true
      }
      await setCurrentSucursal(sucursalWithActivo)
    } catch (error) {
      console.error('Error updating sucursal:', error)
    } finally {
      setOpen(false)
    }
  }

  if (!mounted || !hasSucursales) return null

  const currentDesc = currentSucursal?.descripcion || userSucursales[0]?.descripcion || 'Seleccionar...'

  return (
    <div className={cn("relative w-56", className)} ref={containerRef}>
      <div
        onClick={() => setOpen(!open)}
        className="w-full h-10 px-4 flex items-center justify-between bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-blue-500 transition-all group"
      >
        <span className="truncate text-slate-700 dark:text-slate-200">
          {currentDesc}
        </span>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 transition-colors">
          {open ? 'expand_less' : 'store'}
        </span>
      </div>

      {open && mounted && createPortal(
        <div
          id="user-sucursal-select-portal"
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
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              Sucursales asignadas
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-2">
            {userSucursales.length > 0 ? (
              userSucursales.map((s: Sucursal) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    "px-4 py-3 hover:bg-blue-600 group cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 last:border-none",
                    currentSucursal?.id === s.id && "bg-blue-50 dark:bg-blue-950/50"
                  )}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-white tracking-tight uppercase leading-tight">
                    {s.descripcion}
                  </span>
                  {currentSucursal?.id === s.id && (
                    <span className="material-symbols-outlined text-blue-500 text-sm ml-2">
                      check
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">storefront</span>
                <p className="text-[10px] uppercase font-black tracking-widest">No hay sucursales asignadas</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}