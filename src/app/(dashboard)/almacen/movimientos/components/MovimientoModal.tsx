'use client'

import { useState } from 'react'
import CrudModal from '@/components/ui/CrudModal'
import { cn } from '@/lib/utils'

interface MovimientoModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ProductoLinea {
  id: string
  material_codigo: string
  um: string
  lote: string
  vencimiento: string
  cantidad: number
  valor: number
  moneda: string
  almacen: string
}

export default function MovimientoModal({ open, onClose, onSuccess }: MovimientoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Header state
  const [documento, setDocumento] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState('ingreso') // Default to ingreso
  const [codMovimiento, setCodMovimiento] = useState('')
  const [entidad, setEntidad] = useState('')
  const [referencia, setReferencia] = useState('')

  // Lines state
  const [lineas, setLineas] = useState<ProductoLinea[]>([
    {
      id: 'initial-line-1',
      material_codigo: 'MAT-99230',
      um: 'UND',
      lote: 'L-2394',
      vencimiento: '2023-10-15',
      cantidad: 100,
      valor: 25.50,
      moneda: 'PEN',
      almacen: 'Central'
    }
  ])

  const addLinea = () => {
    const newLinea: ProductoLinea = {
      id: Math.random().toString(36).substr(2, 9),
      material_codigo: '',
      um: 'UND',
      lote: '',
      vencimiento: '',
      cantidad: 1,
      valor: 0,
      moneda: 'PEN',
      almacen: 'Central'
    }
    setLineas([...lineas, newLinea])
  }

  const removeLinea = (index: number) => {
    setLineas(lineas.filter((_, i) => i !== index))
  }

  const handleLineaChange = (index: number, field: keyof ProductoLinea, value: any) => {
    const newLineas = [...lineas]
    newLineas[index] = { ...newLineas[index], [field]: value }
    setLineas(newLineas)
  }

  const handleSave = async () => {
    if (lineas.length === 0) {
      setError('Debe agregar al menos una línea de producto')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        tipo,
        almacen: 'Central', // Fixed for now, can be state
        documento,
        referencia,
        observaciones: `Entidad: ${entidad}. Cód Mov: ${codMovimiento}`,
        detalles: lineas.map(l => ({
          material_codigo: l.material_codigo,
          cantidad: Number(l.cantidad),
          costo_unit: Number(l.valor)
        }))
      }

      const res = await fetch('/api/almacen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar el movimiento')
      }

      onSuccess?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title="Registro de Movimiento de Almacén"
      size="xl"
    >
      <div className="space-y-8">
        {/* Header Description */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona las entradas y salidas de materiales del inventario central.
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs py-1.5 px-3 rounded-lg border border-red-100 dark:border-red-800 animate-pulse">
              {error}
            </div>
          )}
        </div>

        {/* Datos Generales Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">description</span>
            <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">
              Datos Generales
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                ID Movimiento
              </label>
              <input
                type="text"
                disabled
                value="AUTO-GENERADO"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[10px] text-slate-400 font-black italic tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Número Asociado [OC/PEDIDO]
              </label>
              <input
                type="text"
                placeholder="Referencia pedido"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Fecha Movimiento
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Tipo Movimiento
              </label>
              <select 
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="ingreso">Entrada por Compra</option>
                <option value="salida">Salida por Venta</option>
                <option value="ajuste">Ajuste de Saldo</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Código Movimiento
              </label>
              <input
                type="text"
                placeholder="Cód. Interno"
                value={codMovimiento}
                onChange={(e) => setCodMovimiento(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                ID Entidad [CLIENTE/PROV]
              </label>
              <input
                type="text"
                placeholder="Nombre o RUC"
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Número Referencia [GUÍA]
              </label>
              <input
                type="text"
                placeholder="Guía de Remisión"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Líneas de Productos Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">
                Líneas de Productos
              </h4>
            </div>
            <button 
              onClick={addLinea}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              Añadir línea
            </button>
          </div>

          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Detalle</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código Material</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">UM</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cant.</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mon.</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Almacén</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {lineas.map((linea, index) => (
                  <tr key={linea.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-2 text-xs text-slate-400 font-medium">#{index + 1}</td>
                    <td className="py-4 px-2">
                       <input 
                        type="text" 
                        value={linea.material_codigo}
                        onChange={(e) => handleLineaChange(index, 'material_codigo', e.target.value)}
                        placeholder="MAT-00000"
                        className="bg-transparent border-none text-sm font-bold text-slate-800 dark:text-white outline-none w-full"
                       />
                    </td>
                    <td className="py-4 px-2 text-xs font-bold text-slate-600 dark:text-slate-300">{linea.um}</td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={linea.lote}
                        onChange={(e) => handleLineaChange(index, 'lote', e.target.value)}
                        placeholder="Lote"
                        className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 outline-none w-full"
                       />
                    </td>
                    <td className="py-4 px-2">
                       <input 
                        type="date" 
                        value={linea.vencimiento}
                        onChange={(e) => handleLineaChange(index, 'vencimiento', e.target.value)}
                        className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 outline-none w-full"
                       />
                    </td>
                    <td className="py-4 px-2 font-bold text-sm text-slate-800 dark:text-white">
                      <input 
                        type="number" 
                        value={linea.cantidad}
                        onChange={(e) => handleLineaChange(index, 'cantidad', e.target.value)}
                        className="bg-transparent border-none text-sm font-bold outline-none w-16"
                       />
                    </td>
                    <td className="py-4 px-2 text-sm text-slate-600 dark:text-slate-400">
                      <input 
                        type="number" 
                        step="0.01"
                        value={linea.valor}
                        onChange={(e) => handleLineaChange(index, 'valor', e.target.value)}
                        className="bg-transparent border-none text-sm outline-none w-20"
                       />
                    </td>
                    <td className="py-4 px-2 text-xs font-bold text-slate-600 dark:text-slate-300">{linea.moneda}</td>
                    <td className="py-4 px-2 text-xs text-slate-600 dark:text-slate-400">{linea.almacen}</td>
                    <td className="py-4 px-2 text-right">
                      <button 
                        onClick={() => removeLinea(index)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {lineas.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic text-sm">
              <p>Haga clic en 'Añadir línea' para agregar más productos al movimiento.</p>
            </div>
          )}
        </div>

        {/* Auditoría Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex-1 w-full md:max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">history</span>
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">
                Auditoría
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Creación</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className="material-symbols-outlined text-xs">calendar_today</span>
                  {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Usuario Creación</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span className="material-symbols-outlined text-xs">person</span>
                  Usuario Actual
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Modificación</span>
                <span className="text-xs text-slate-400 italic block">Pendiente de guardado</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Usuario Modificación</span>
                <span className="text-xs text-slate-400 block">-</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-64">
            <button 
              onClick={handleSave}
              disabled={loading}
              className={cn(
                "w-full bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20",
                loading ? "opacity-70 cursor-not-allowed" : "hover:bg-primary-dark"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined">save</span>
              )}
              {loading ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b-2"
            >
              <span className="material-symbols-outlined">cancel</span>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </CrudModal>
  )
}
