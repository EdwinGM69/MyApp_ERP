'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import Switch from '@/components/ui/Switch'

interface Variable {
  id?: number
  variable_id: string
  descripcion: string
  tipo: string
  valor?: number
  ingreso_manual: boolean
  tempId?: string // Frontend only
}

interface Paso {
  id?: number
  secuencia_paso: number
  descripcion_corta: string
  descripcion_larga?: string
  formula: string
  tipo: string
  activo: boolean
  condicion_id?: number
  tempId?: string // Frontend only
}

interface EsquemaCalculo {
  id?: number
  codigo: string
  descripcion: string
  activo: boolean
  variables: Variable[]
  pasos: Paso[]
}

interface EsquemaCalculoFormProps {
  esquemaToEdit?: EsquemaCalculo
}

export default function EsquemaCalculoForm({ esquemaToEdit }: EsquemaCalculoFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loadingTipos, setLoadingTipos] = useState(true)
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([])
  const [tiposCondicion, setTiposCondicion] = useState<any[]>([])
  const [condiciones, setCondiciones] = useState<any[]>([])

  // State
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(true)
  const [variables, setVariables] = useState<Variable[]>([])
  const [pasos, setPasos] = useState<Paso[]>([])
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)
  const [isAddingVariable, setIsAddingVariable] = useState(false)
  const [expandedVariables, setExpandedVariables] = useState<(string | number)[]>([])
  const [expandedPasos, setExpandedPasos] = useState<(string | number)[]>([])
  const [newVarData, setNewVarData] = useState<Partial<Variable>>({
    variable_id: '',
    descripcion: '',
    tipo: 'Monto',
    valor: 0,
    ingreso_manual: false
  })

  // Fetch TipoOperacion, TipoCondicion and Condiciones for select
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const [resOper, resCond, resComercialCond] = await Promise.all([
          apiFetch('/api/logistica/tipos-operacion'),
          apiFetch('/api/tipos-condicion'),
          apiFetch('/api/comercial/condiciones')
        ])
        const [jsonOper, jsonCond, jsonComercialCond] = await Promise.all([
          resOper.json(),
          resCond.json(),
          resComercialCond.json()
        ])
        setTiposOperacion(jsonOper.data || [])
        setTiposCondicion(jsonCond.data || [])
        setCondiciones(jsonComercialCond.data || [])
      } catch (error) {
        toast.error('Error al cargar tipos de datos')
      } finally {
        setLoadingTipos(false)
      }
    }
    fetchTipos()
  }, [])

  useEffect(() => {
    if (esquemaToEdit) {
      setCodigo(esquemaToEdit.codigo || '')
      setDescripcion(esquemaToEdit.descripcion || '')
      setActivo(esquemaToEdit.activo ?? true)
      setVariables(esquemaToEdit.variables || [])
      setPasos(esquemaToEdit.pasos || [])
    }
  }, [esquemaToEdit])

  const handleAddVariable = () => {
    setIsAddingVariable(true)
    setNewVarData({
      variable_id: '',
      descripcion: '',
      tipo: 'Monto',
      valor: 0,
      ingreso_manual: false,
    })
  }

  const handleSaveNewVariable = () => {
    if (!newVarData.variable_id || !newVarData.descripcion) {
      toast.error('Completa los campos obligatorios')
      return
    }

    const newVar: Variable = {
      ...newVarData as Variable,
      tempId: Math.random().toString(36).substring(2, 11),
    }

    setVariables([...variables, newVar])
    setIsAddingVariable(false)
    toast.success('Variable añadida')
  }

  const toggleExpand = (id: string | number) => {
    setExpandedVariables(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const toggleExpandPaso = (id: string | number) => {
    setExpandedPasos(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleUpdateVariable = (id: string | number, updates: Partial<Variable>) => {
    setVariables(variables.map(v => (v.id === id || v.tempId === id) ? { ...v, ...updates } : v))
  }

  const handleRemoveVariable = (id: string | number) => {
    setVariables(variables.filter(v => v.id !== id && v.tempId !== id))
    if (selectedVariable === id) setSelectedVariable(null)
  }

  const handleAddPaso = () => {
    const nextSeq = pasos.length > 0 ? Math.max(...pasos.map(p => p.secuencia_paso)) + 1 : 1
    const newPaso: Paso = {
      tempId: Math.random().toString(36).substring(2, 11),
      secuencia_paso: nextSeq,
      descripcion_corta: 'Nuevo Paso',
      formula: '',
      tipo: 'Total',
      activo: true
    }
    setPasos([...pasos, newPaso])
    // Auto expand new paso
    setExpandedPasos([newPaso.tempId!])
  }

  const handleUpdatePaso = (id: string | number, updates: Partial<Paso>) => {
    setPasos(pasos.map(p => (p.id === id || p.tempId === id) ? { ...p, ...updates } : p))
  }

  const handleRemovePaso = (id: string | number) => {
    setPasos(pasos.filter(p => p.id !== id && p.tempId !== id))
  }

  const handleMovePasoUp = (index: number) => {
    if (index === 0) return;
    const newPasos = [...pasos];
    const tempSeq = newPasos[index].secuencia_paso;
    newPasos[index].secuencia_paso = newPasos[index - 1].secuencia_paso;
    newPasos[index - 1].secuencia_paso = tempSeq;

    const temp = newPasos[index];
    newPasos[index] = newPasos[index - 1];
    newPasos[index - 1] = temp;

    setPasos(newPasos);
  }

  const handleMovePasoDown = (index: number) => {
    if (index === pasos.length - 1) return;
    const newPasos = [...pasos];
    const tempSeq = newPasos[index].secuencia_paso;
    newPasos[index].secuencia_paso = newPasos[index + 1].secuencia_paso;
    newPasos[index + 1].secuencia_paso = tempSeq;

    const temp = newPasos[index];
    newPasos[index] = newPasos[index + 1];
    newPasos[index + 1] = temp;

    setPasos(newPasos);
  }

  const stepResults = useMemo(() => {
    const results: Record<number, number> = {}

    // Preparar variables de entrada
    const varContext: Record<string, number> = {}
    variables.forEach(v => {
      if (v.variable_id) {
        // Asegurar que el valor sea tratado como número
        const val = typeof v.valor === 'number' ? v.valor : parseFloat(v.valor || '0')
        varContext[v.variable_id.toUpperCase().trim()] = isNaN(val) ? 0 : val
      }
    })

    // Ordenar variables por longitud descendente para evitar reemplazos parciales
    const sortedVarNames = Object.keys(varContext).sort((a, b) => b.length - a.length)

    // Procesar pasos secuencialmente por su número de secuencia
    const sortedPasos = [...pasos].sort((a, b) => a.secuencia_paso - b.secuencia_paso)

    sortedPasos.forEach(p => {
      let formula = (p.formula || '').toUpperCase().trim()
      if (!formula) {
        results[p.secuencia_paso] = 0
        return
      }

      // 1. Reemplazar variables de entrada
      sortedVarNames.forEach(vName => {
        // Usar word boundary para evitar reemplazar partes de otras palabras
        const regex = new RegExp(`\\b${vName}\\b`, 'g')
        formula = formula.replace(regex, varContext[vName].toString())
      })

      // 2. Reemplazar referencias a pasos anteriores (s1, s2, etc.)
      formula = formula.replace(/S([0-9]+)\b/g, (match, num) => {
        const stepNum = parseInt(num)
        return (results[stepNum] || 0).toString()
      })

      try {
        // 3. Evaluar la fórmula matemáticamente
        // Usamos Function para una evaluación segura del string resultante
        const evaluated = new Function(`return ${formula}`)()
        results[p.secuencia_paso] = Number.isFinite(evaluated) ? evaluated : 0
      } catch (err) {
        console.warn(`Error evaluando fórmula del paso ${p.secuencia_paso}:`, err)
        results[p.secuencia_paso] = 0
      }
    })

    return results
  }, [variables, pasos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (!codigo || !descripcion) {
      toast.error('Código y Descripción son obligatorios')
      setSaving(false)
      return
    }

    if (pasos.some(p => !p.formula || !p.descripcion_corta)) {
      toast.error('Todos los pasos deben tener descripción y fórmula')
      setSaving(false)
      return
    }

    const payload = {
      id: esquemaToEdit?.id,
      codigo,
      descripcion,
      activo,
      variables: variables.map(({ tempId, ...rest }) => ({
        ...rest,
        valor: typeof rest.valor === 'number' ? rest.valor : Number(rest.valor || 0)
      })),
      pasos: pasos.map(({ tempId, ...rest }) => ({
        ...rest,
        condicion_id: rest.condicion_id ? Number(rest.condicion_id) : null
      })),
    }

    try {
      const res = await apiFetch('/api/esquemas-calculo', {
        method: esquemaToEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })

      const json = await res.json()

      if (!res.ok) {
        // Handle case where error might be an array or object
        const errorMsg = typeof json.error === 'object'
          ? JSON.stringify(json.error)
          : json.error || 'Error al guardar'
        throw new Error(errorMsg)
      }

      toast.success(esquemaToEdit ? 'Esquema actualizado' : 'Esquema creado')
      router.push('/maestros/comercial/esquemas-calculo')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving esquema:', error)
      toast.error(error.message || 'Error al guardar el esquema')
    } finally {
      setSaving(false)
    }
  }

  const currentVar = variables.find(v => (v.id?.toString() === selectedVariable) || (v.tempId === selectedVariable))

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Control Bar */}
      <div className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-8 flex items-center justify-between z-40 shadow-sm transition-all">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => router.push('/maestros/comercial/esquemas-calculo')}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex flex-col min-w-0 max-w-md">
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-2 truncate">
              {codigo || 'NUEVO_ESQUEMA'}
              <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20 lowercase tracking-normal font-bold">borrador</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase truncate mt-0.5">
              {descripcion || 'Sin descripción asignada'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Basic Info Inputs */}
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <input
              value={codigo} onChange={e => setCodigo(e.target.value)}
              placeholder="CÓDIGO"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2 text-xs font-mono outline-none transition-all w-32 shadow-sm"
            />
            <input
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción del esquema..."
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2 text-xs outline-none transition-all w-64 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activo</span>
            <Switch checked={activo} onChange={setActivo} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
            Guardar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Variables */}
        <div className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0a0d11]/80 backdrop-blur-md flex flex-col">
          <div className="px-6 mt-2 mb-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Variables de Entrada</h2>
              {!isAddingVariable && (
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              )}
            </div>

            {/* "Nueva Variable" Card (Image 1 style) */}
            {isAddingVariable && (
              <div className="bg-slate-100 border border-blue-500/30 rounded-2xl p-6 mb-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Nueva variable</h3>
                  <button onClick={() => setIsAddingVariable(false)} className="text-slate-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">ID (código)</label>
                    <input
                      value={newVarData.variable_id}
                      onChange={e => setNewVarData({ ...newVarData, variable_id: e.target.value })}
                      placeholder="ej: mi_variable"
                      className="w-full bg-white border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-black-100 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Etiqueta</label>
                    <input
                      value={newVarData.descripcion}
                      onChange={e => setNewVarData({ ...newVarData, descripcion: e.target.value })}
                      placeholder="Descripción legible"
                      className="w-full bg-white border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-1.5 text-xs text-black-100 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>


                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Tipo de variable</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Monto', 'Porcentaje', 'Numero'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewVarData({ ...newVarData, tipo: t })}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1",
                            newVarData.tipo === t
                              ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]"
                              : "bg-[#0d1117] border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          <span className="text-sm font-black">
                            {t === 'Monto' ? '$' : t === 'Porcentaje' ? '%' : '#'}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-tighter">
                            {t === 'Monto' ? 'monto' : t === 'Porcentaje' ? 'pct' : 'entero'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                      Valor ({newVarData.tipo === 'Monto' ? 'S/' : newVarData.tipo === 'Porcentaje' ? '%' : ''})
                    </label>
                    <input
                      type="number"
                      value={newVarData.valor}
                      onChange={e => setNewVarData({ ...newVarData, valor: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-black-100 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingreso Manual</span>
                      <Switch checked={newVarData.ingreso_manual || false} onChange={(v) => setNewVarData({ ...newVarData, ingreso_manual: v })} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveNewVariable}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsAddingVariable(false)}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-8 custom-scrollbar">
            {variables.map(v => {
              const isExpanded = expandedVariables.includes((v.id || v.tempId) as any)
              return (
                <div
                  key={v.id || v.tempId}
                  className={cn(
                    "bg-slate-100 border border-blue-500/20 rounded-2xl overflow-hidden transition-all duration-300",
                    isExpanded ? "ring-1 ring-blue-500/30 shadow-xl" : "hover:border-blue-500/40 shadow-sm"
                  )}
                >
                  {/* Card Header (Collapsed View - Image 2 style) */}
                  <div
                    onClick={() => toggleExpand((v.id || v.tempId) as any)}
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black",
                      v.tipo === 'Monto' ? "bg-blue-500/20 text-blue-400" :
                        v.tipo === 'Porcentaje' ? "bg-orange-500/20 text-orange-400" :
                          "bg-slate-500/20 text-slate-400"
                    )}>
                      {v.tipo === 'Monto' ? '$' : v.tipo === 'Porcentaje' ? '%' : '#'}
                    </div>
                    <p className="flex-1 text-[11px] font-bold text-slate-700 truncate tracking-tight uppercase">{v.variable_id}</p>
                    <p className="text-[10px] font-mono font-black text-blue-600">
                      {v.tipo === 'Monto' ? `S/ ${v.valor || '0.00'}` :
                        v.tipo === 'Porcentaje' ? `${v.valor || '0'} %` :
                          v.valor || '0'}
                    </p>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveVariable((v.id || v.tempId) as any); }}
                      className="p-1 text-slate-600 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>

                    <span className={cn(
                      "material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-300",
                      isExpanded && "rotate-180"
                    )}>
                      expand_more
                    </span>
                  </div>

                  {/* Expanded View (Image 2 style) */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/50 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block uppercase">ID</label>
                        <input
                          value={v.variable_id}
                          onChange={e => handleUpdateVariable((v.id || v.tempId) as any, { variable_id: e.target.value })}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-800 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block uppercase">Etiqueta</label>
                        <input
                          value={v.descripcion}
                          onChange={e => handleUpdateVariable((v.id || v.tempId) as any, { descripcion: e.target.value })}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-800 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block uppercase">Valor</label>
                          <input
                            type="number"
                            value={v.valor}
                            onChange={e => handleUpdateVariable((v.id || v.tempId) as any, { valor: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-800 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block uppercase">Tipo</label>
                          <select
                            value={v.tipo}
                            onChange={e => handleUpdateVariable((v.id || v.tempId) as any, { tipo: e.target.value })}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-800 outline-none transition-all appearance-none"
                          >
                            <option value="Monto">S/ Monto</option>
                            <option value="Porcentaje">% Porcentaje</option>
                            <option value="Numero"># Número</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-white/50 border border-slate-100 rounded-xl">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ingreso Manual</label>
                        <Switch checked={v.ingreso_manual} onChange={(val) => handleUpdateVariable((v.id || v.tempId) as any, { ingreso_manual: val })} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content: Steps */}
        <div className="flex-1 bg-white dark:bg-slate-900/50 flex flex-col relative overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

          <div className="flex-1 overflow-y-auto px-12 pt-6 pb-12 custom-scrollbar relative z-10">
            <div className="max-w-4xl mx-auto space-y-10 pb-32">
              {pasos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <span className="material-symbols-outlined text-[40px]">architecture</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay pasos definidos</h3>
                  <p className="text-xs text-slate-500 mt-2">Comienza agregando el primer paso del cálculo.</p>
                </div>
              )}

              {pasos.map((p, idx) => {
                const isExpanded = expandedPasos.includes((p.id || p.tempId) as any)

                // Type-based styling
                const colors = { bg: 'bg-blue-600', text: 'text-blue-400', ring: 'ring-blue-600/30', pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }

                return (
                  <div key={p.id || p.tempId} className="relative animate-in slide-in-from-bottom-6 duration-700">
                    {idx < pasos.length - 1 && (
                      <div className="absolute -bottom-10 left-12 w-0.5 h-10 bg-gradient-to-b from-blue-500/50 to-transparent z-0"></div>
                    )}

                    <div className={cn(
                      "rounded-3xl overflow-hidden transition-all duration-500 border relative z-10",
                      isExpanded
                        ? "bg-slate-100 border-blue-500/50 ring-4 ring-blue-500/10"
                        : "bg-slate-100 border-slate-200 hover:border-blue-500/30"
                    )}>

                      {/* Header (Always Visible) */}
                      <div
                        onClick={() => toggleExpandPaso((p.id || p.tempId) as any)}
                        className={cn(
                          "px-5 py-2 flex items-center justify-between cursor-pointer select-none transition-colors",
                          isExpanded ? "bg-blue-600/5" : "bg-white/40"
                        )}
                      >
                        <div className="flex items-center gap-5">
                          <div className={cn("flex flex-col items-center justify-center gap-0.5 mr-2", isExpanded ? "opacity-100" : "opacity-50 hover:opacity-100 transition-opacity")}>
                            <span
                              className={cn(
                                "material-symbols-outlined text-[16px] leading-[8px] cursor-pointer hover:text-blue-500 transition-colors",
                                idx === 0 && "opacity-30 cursor-not-allowed hover:text-inherit"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx > 0) handleMovePasoUp(idx);
                              }}
                            >
                              expand_less
                            </span>
                            <span
                              className={cn(
                                "material-symbols-outlined text-[16px] leading-[8px] cursor-pointer hover:text-blue-500 transition-colors",
                                idx === pasos.length - 1 && "opacity-30 cursor-not-allowed hover:text-inherit"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx < pasos.length - 1) handleMovePasoDown(idx);
                              }}
                            >
                              expand_more
                            </span>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg transition-transform duration-300",
                            isExpanded ? "scale-110" : "",
                            colors.bg, "text-white shadow-" + colors.bg.split('-')[1] + "-500/30"
                          )}>
                            {p.secuencia_paso}
                          </div>
                          <div>
                            <h3 className={cn(
                              "text-[10px] font-black tracking-tight uppercase",
                              isExpanded ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"
                            )}>
                              {p.descripcion_corta || 'Sin nombre'}
                            </h3>
                            {!isExpanded && p.descripcion_larga && (
                              <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">{p.descripcion_larga}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemovePaso((p.id || p.tempId) as any); }}
                            className="w-7 h-7 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                          <span className={cn(
                            "material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-300",
                            isExpanded && "rotate-180"
                          )}>
                            expand_more
                          </span>
                        </div>
                      </div>

                      {/* Collapsed Content (Image 1 style) */}
                      {!isExpanded && (
                        <div className="px-6 pb-2 pt-0 space-y-1.5">
                          <div className="bg-[#0d1117] dark:bg-black/40 rounded-lg px-2.5 py-1.5 border border-slate-200/50 dark:border-slate-800 shadow-inner group-hover/card:border-blue-500/20 transition-all">
                            <div className="flex items-center gap-4">
                              <span className="text-[8px] font-black text-slate-100 uppercase tracking-widest">Fórmula</span>
                              <code className="text-[11px] font-mono text-blue-400 dark:text-blue-300 flex-1">
                                {p.formula || '0'}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pl-4">
                            <span className="text-[6.5px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Resultado Estimado</span>
                            <div className="flex items-baseline gap-2">
                              <span className={cn("text-[15px] font-black tracking-tighter", colors.text)}>
                                {(stepResults[p.secuencia_paso] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase">PEN</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded Content (Image 2 style) */}
                      {isExpanded && (
                        <div className="px-8 pb-8 pt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Nombre del paso</label>
                              <input
                                value={p.descripcion_corta}
                                onChange={e => handleUpdatePaso((p.id || p.tempId) as any, { descripcion_corta: e.target.value })}
                                className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all shadow-sm"
                                placeholder="Ej: Precio neto"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Paso</label>
                              <select
                                value={p.tipo}
                                onChange={e => handleUpdatePaso((p.id || p.tempId) as any, { tipo: e.target.value })}
                                className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all shadow-sm appearance-none"
                              >
                                <option value="Precio">Precio</option>
                                <option value="Descuento">Descuento</option>
                                <option value="Impuesto">Impuesto</option>
                                <option value="Subtotal">Subtotal</option>
                                <option value="Total">Total</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Descripción Detallada</label>
                              <input
                                value={p.descripcion_larga || ''}
                                onChange={e => handleUpdatePaso((p.id || p.tempId) as any, { descripcion_larga: e.target.value })}
                                className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs outline-none transition-all shadow-sm"
                                placeholder="Explica qué calcula este paso..."
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Condición comercial vinculada</label>
                              <select
                                value={p.condicion_id || ''}
                                onChange={e => handleUpdatePaso((p.id || p.tempId) as any, { condicion_id: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all shadow-sm appearance-none"
                              >
                                <option value="">Ninguna</option>
                                {tiposCondicion.map(tc => (
                                  <option key={tc.id} value={tc.id}>
                                    {tc.codigo} - {tc.descripcion}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span>Editor de Fórmula</span>
                              <span className="text-[7.5px] opacity-50 font-medium lowercase">f(x) syntax</span>
                            </label>
                            <textarea
                              id={`formula-${p.id || p.tempId}`}
                              value={p.formula}
                              onChange={e => handleUpdatePaso((p.id || p.tempId) as any, { formula: e.target.value })}
                              className="w-full bg-white border border-slate-800 focus:border-blue-500 rounded-2xl p-3 text-[13px] font-mono text-black-300 outline-none transition-all min-h-[60px] shadow-2xl"
                              placeholder="Ej: s1 * (base / 100)"
                            />

                            {/* Workshop Panel (Image 2 style) */}
                            <div className="space-y-3 pt-2">
                              <div>
                                <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-2">Insertar en fórmula</p>

                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[7px] text-slate-600 dark:text-slate-500 font-bold uppercase mb-2">Variables:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {variables.map(v => (
                                        <button
                                          key={v.variable_id}
                                          onClick={() => {
                                            const currentPasoId = (p.id || p.tempId) as any;
                                            const updatedFormula = p.formula + ' ' + v.variable_id;
                                            handleUpdatePaso(currentPasoId, { formula: updatedFormula });
                                          }}
                                          className="px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black hover:bg-orange-500/20 transition-all active:scale-95"
                                        >
                                          {v.variable_id}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-[7px] text-slate-600 dark:text-slate-500 font-bold uppercase mb-2">Pasos Anteriores:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {pasos.slice(0, idx).map(sp => (
                                        <button
                                          key={sp.secuencia_paso}
                                          onClick={() => {
                                            const currentPasoId = (p.id || p.tempId) as any;
                                            const updatedFormula = p.formula + ` s${sp.secuencia_paso}`;
                                            handleUpdatePaso(currentPasoId, { formula: updatedFormula });
                                          }}
                                          className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black hover:bg-purple-500/20 transition-all active:scale-95"
                                        >
                                          s{sp.secuencia_paso}: {sp.descripcion_corta}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-4 items-center">
                                    <div>
                                      <p className="text-[7px] text-slate-600 dark:text-slate-500 font-bold uppercase mb-2">Operadores:</p>
                                      <div className="flex gap-1">
                                        {['+', '-', '*', '/', '(', ')'].map(op => (
                                          <button
                                            key={op}
                                            onClick={() => handleUpdatePaso((p.id || p.tempId) as any, { formula: p.formula + op })}
                                            className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black hover:bg-slate-700 transition-all"
                                          >
                                            {op}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[7px] text-slate-600 dark:text-slate-500 font-bold uppercase mb-2">Funciones:</p>
                                      <div className="flex gap-1 flex-wrap">
                                        {['100', 'ROUND(', 'MIN(', 'MAX(', 'ABS('].map(fn => (
                                          <button
                                            key={fn}
                                            onClick={() => handleUpdatePaso((p.id || p.tempId) as any, { formula: p.formula + fn })}
                                            className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black hover:bg-blue-500/20 transition-all"
                                          >
                                            {fn}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/50">
                                <div className="flex items-center gap-6">
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-[6.5px] font-black text-slate-500 uppercase tracking-widest">Resultado</p>
                                    <p className={cn("text-xs font-black tracking-tighter", colors.text)}>
                                      {(stepResults[p.secuencia_paso] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => toggleExpandPaso((p.id || p.tempId) as any)}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                  >
                                    Listo
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Result Stripe (Image 2 style) */}
                      <div className={cn(
                        "h-1 relative overflow-hidden",
                        colors.bg
                      )}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={handleAddPaso}
                className="group w-full h-20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 text-[11px] font-black text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] shadow-sm"
              >
                <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">add_circle</span>
                Agregar nuevo paso de cálculo
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  )
}
