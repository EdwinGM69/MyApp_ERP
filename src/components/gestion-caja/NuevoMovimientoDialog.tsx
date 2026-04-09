'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import ClienteSelect from '@/components/ui/ClienteSelect'
import ProveedorSelect from '@/components/ui/ProveedorSelect'

interface Props {
  session: any
  onClose: () => void
  onSaved: () => void
}

export default function NuevoMovimientoDialog({ session, onClose, onSaved }: Props) {
  const [conceptos, setConceptos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    concepto_id: 0,
    importe: 0,
    motivo: '',
    numero_documento: '',
    persona: '',
    cliente_id: null as number | null,
    proveedor_id: null as number | null,
    cliente_label: '',
    proveedor_label: '',
    moneda_id: session.moneda_id,
    sucursal_id: session.sucursal_id,
    caja_id: session.caja_id,
  })

  useEffect(() => {
    const fetchConceptos = async () => {
      setLoading(true)
      try {
        const res = await apiFetch('/api/tesoreria/conceptos-caja')
        if (res.ok) {
          const result = await res.json()
          const list = result.data || []
          setConceptos(list.filter((c: any) => c.activo))
        } else {
          toast.error('No se pudieron cargar los conceptos de caja')
        }
      } catch (error) {
        console.error('Error fetching concepts:', error)
        toast.error('Error de comunicación al cargar conceptos')
      } finally {
        setLoading(false)
      }
    }
    fetchConceptos()
  }, [])

  const selectedConcepto = conceptos.find(c => c.id === formData.concepto_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.concepto_id || !formData.importe) {
      toast.error('Complete los campos obligatorios')
      return
    }

    // Dynamic Validations
    if (selectedConcepto?.requiere_cliente && !formData.cliente_id) {
      toast.error('Debe seleccionar un cliente')
      return
    }
    if (selectedConcepto?.requiere_proveedor && !formData.proveedor_id) {
      toast.error('Debe seleccionar un proveedor')
      return
    }
    if (selectedConcepto?.requiere_persona && !formData.persona) {
      toast.error('Debe ingresar el nombre del responsable')
      return
    }

    setSaving(true)
    try {
      const isEgreso = selectedConcepto?.tipo_operacion?.toUpperCase() === 'EGRESO'
      const importeFinal = isEgreso ? -Math.abs(formData.importe) : Math.abs(formData.importe)

      const res = await apiFetch('/api/gestion-caja/transacciones', {
        method: 'POST',
        body: JSON.stringify({ 
          ...formData, 
          importe: importeFinal,
          fecha_documento: new Date().toISOString(),
          sucursal_id: session.sucursal_id,
          caja_id: session.caja_id,
          sesion_caja_id: session.id
        })
      })

      if (res.ok) {
        toast.success('Movimiento registrado correctamente')
        onSaved()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch (error) {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/60 transition-all duration-500 animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-50/50 dark:bg-slate-950/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
           <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Nuevo Movimiento</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual / {session.caja?.descripcion}</p>
           </div>
           <button onClick={onClose} className="size-10 rounded-full hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition-all">
              <span className="material-symbols-outlined text-slate-400">close</span>
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[80vh]">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Concepto de Caja</label>
            <select 
              required
              value={formData.concepto_id}
              onChange={(e) => {
                const id = parseInt(e.target.value)
                setFormData(p => ({ 
                  ...p, 
                  concepto_id: id,
                  cliente_id: null,
                  proveedor_id: null,
                  cliente_label: '',
                  proveedor_label: '',
                  persona: ''
                }))
              }}
              className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary transition-all text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight"
            >
              <option value="0">Seleccionar concepto...</option>
              {conceptos.map(c => (
                <option key={c.id} value={c.id}>{c.tipo_operacion} - {c.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Importe</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.importe || ''}
                  onChange={(e) => setFormData(p => ({ ...p, importe: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary transition-all text-sm font-black text-slate-900 dark:text-white"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Nº Documento</label>
                <input 
                  type="text"
                  value={formData.numero_documento}
                  onChange={(e) => setFormData(p => ({ ...p, numero_documento: e.target.value }))}
                  placeholder="OP-12345"
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary transition-all text-sm font-bold text-slate-900 dark:text-white uppercase"
                />
             </div>
          </div>

          {/* Conditional Fields */}
          {selectedConcepto?.requiere_cliente && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Cliente Asociado</label>
              <ClienteSelect 
                selectedLabel={formData.cliente_label}
                onSelect={(cli) => setFormData(p => ({ ...p, cliente_id: cli.id, cliente_label: cli.nombre }))}
              />
            </div>
          )}

          {selectedConcepto?.requiere_proveedor && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Proveedor Asociado</label>
              <ProveedorSelect 
                selectedLabel={formData.proveedor_label}
                onSelect={(prov) => setFormData(p => ({ ...p, proveedor_id: prov.id, proveedor_label: prov.nombre }))}
              />
            </div>
          )}

          {selectedConcepto?.requiere_persona && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Responsable / Persona</label>
              <input 
                required
                type="text"
                value={formData.persona}
                onChange={(e) => setFormData(p => ({ ...p, persona: e.target.value }))}
                placeholder="Nombre del cliente o encargado"
                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary transition-all text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Motivo / Observación</label>
            <textarea 
              rows={3}
              value={formData.motivo}
              onChange={(e) => setFormData(p => ({ ...p, motivo: e.target.value }))}
              placeholder="Detalle del movimiento..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary transition-all text-xs font-medium text-slate-600 dark:text-slate-300 resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <button 
              type="button" 
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
             >
               Cancelar
             </button>
             <button 
              disabled={saving}
              className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:grayscale"
             >
                {saving ? 'Guardando...' : 'Registrar Movimiento'}
             </button>
          </div>
        </form>
      </div>
    </div>
  )
}
