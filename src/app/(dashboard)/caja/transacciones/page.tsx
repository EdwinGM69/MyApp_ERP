'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import StatsCard from '@/components/ui/StatsCard'
import CrudModal from '@/components/ui/CrudModal'
import Badge from '@/components/ui/Badge'
import { apiFetch, useAuthStore } from '@/hooks/useAuth'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Caja {
  id: number
  fecha_apertura: string
  fecha_cierre?: string
  saldo_inicial: number
  saldo_cierre?: number
  moneda: string
  estado: string
  obs_apertura?: string
  transacciones: Array<{ id: number; tipo: string; concepto: string; monto: number; fecha: string }>
}

export default function CajaPage() {
  const [cajaAbierta, setCajaAbierta] = useState<Caja | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalApertura, setModalApertura] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [formApertura, setFormApertura] = useState({ id_caja: '', saldo_inicial: 0, moneda: 'USD', observaciones: '' })
  const [saving, setSaving] = useState(false)
  const user = useAuthStore((state) => state.user)
  const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const [formMovimiento, setFormMovimiento] = useState({
    id_movimiento: 'MOV-002495',
    id_caja: '',
    tipo: 'ingreso',
    fecha: new Date().toISOString().split('T')[0],
    usuario: user?.nombre || '',
    concepto: '',
    estado: 'Activa',
    monto: 0,
    moneda: 'USD',
    referencia: ''
  })

  const [desglose, setDesglose] = useState<Array<{ id: number; nominacion: string; moneda: string; importe: number }>>([
    { id: 1, nominacion: 'Billetes 100', moneda: 'USD', importe: 500 },
    { id: 2, nominacion: 'Billetes 50', moneda: 'USD', importe: 250 },
  ])

  useEffect(() => {
    if (user) setFormMovimiento(prev => ({ ...prev, usuario: user.nombre }))
  }, [user])

  useEffect(() => {
    setDesglose(prev => prev.map(d => ({ ...d, moneda: formMovimiento.moneda })))
  }, [formMovimiento.moneda])

  useEffect(() => {
    const total = desglose.reduce((acc, curr) => acc + curr.importe, 0)
    setFormMovimiento(prev => ({ ...prev, monto: total }))
  }, [desglose])

  const addDesglose = () => {
    setDesglose([...desglose, { id: Date.now(), nominacion: '', moneda: formMovimiento.moneda, importe: 0 }])
  }

  const removeDesglose = (id: number) => {
    setDesglose(desglose.filter(d => d.id !== id))
  }

  const updateDesglose = (id: number, field: string, value: any) => {
    setDesglose(desglose.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const fetchCaja = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch('/api/caja?estado=Abierto')
    const json = await res.json()
    setCajaAbierta(json.data?.[0] ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCaja() }, [fetchCaja])

  async function abrirCaja(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch('/api/caja', {
        method: 'POST',
        body: JSON.stringify({ accion: 'abrir', ...formApertura }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Caja abierta correctamente')
      setModalApertura(false)
      fetchCaja()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function cerrarCaja() {
    if (!cajaAbierta) return
    if (!confirm('¿Confirmas el cierre de caja?')) return
    setSaving(true)
    try {
      const totalIngresos = cajaAbierta.transacciones.filter((t) => t.tipo === 'ingreso').reduce((a, t) => a + Number(t.monto), 0)
      const totalEgresos = cajaAbierta.transacciones.filter((t) => t.tipo === 'egreso').reduce((a, t) => a + Number(t.monto), 0)
      const saldoCierre = Number(cajaAbierta.saldo_inicial) + totalIngresos - totalEgresos

      const res = await apiFetch('/api/caja', {
        method: 'POST',
        body: JSON.stringify({ accion: 'cerrar', caja_id: cajaAbierta.id, saldo_cierre: saldoCierre }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Caja cerrada correctamente')
      fetchCaja()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!cajaAbierta) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/caja', {
        method: 'POST',
        body: JSON.stringify({ accion: 'movimiento', caja_id: cajaAbierta.id, ...formMovimiento }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Movimiento registrado')
      setModalMovimiento(false)
      setFormMovimiento({
        id_movimiento: `MOV-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`,
        id_caja: '',
        tipo: 'ingreso',
        fecha: new Date().toISOString().split('T')[0],
        usuario: user?.nombre || '',
        concepto: '',
        estado: 'Activa',
        monto: 0,
        moneda: 'USD',
        referencia: ''
      })
      setDesglose([])
      fetchCaja()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const ingresos = cajaAbierta?.transacciones.filter((t) => t.tipo === 'ingreso').reduce((a, t) => a + Number(t.monto), 0) ?? 0
  const egresos = cajaAbierta?.transacciones.filter((t) => t.tipo === 'egreso').reduce((a, t) => a + Number(t.monto), 0) ?? 0
  const saldoActual = Number(cajaAbierta?.saldo_inicial ?? 0) + ingresos - egresos

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Gestión de Caja" />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Caja
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              {cajaAbierta ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Caja abierta desde {formatDateTime(cajaAbierta.fecha_apertura)}
                </span>
              ) : (
                'No hay caja abierta'
              )}
            </p>
          </div>

          <div className="flex gap-3">
            {!cajaAbierta ? (
              <button onClick={() => setModalApertura(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-500/20">
                <span className="material-symbols-outlined text-xl">lock_open</span>
                Abrir Caja
              </button>
            ) : (
              <>
                <button onClick={() => setModalMovimiento(true)}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all">
                  <span className="material-symbols-outlined text-xl">add</span>
                  Movimiento
                </button>
                <button onClick={cerrarCaja} disabled={saving}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-60">
                  <span className="material-symbols-outlined text-xl">lock</span>
                  Cerrar Caja
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Saldo Inicial" value={formatCurrency(Number(cajaAbierta?.saldo_inicial ?? 0))}
            icon="account_balance_wallet" iconColor="text-slate-500" iconBg="bg-slate-100" />
          <StatsCard title="Ingresos del Día" value={formatCurrency(ingresos)}
            icon="trending_up" iconColor="text-green-500" iconBg="bg-green-500/10"
            trend={{ value: `${cajaAbierta?.transacciones.filter((t) => t.tipo === 'ingreso').length ?? 0} mov.`, positive: true }} />
          <StatsCard title="Egresos del Día" value={formatCurrency(egresos)}
            icon="trending_down" iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatsCard title="Saldo Actual" value={formatCurrency(saldoActual)}
            icon="payments" iconColor="text-primary" iconBg="bg-primary/10" />
        </div>

        {/* Transactions table */}
        {cajaAbierta && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white">Movimientos del Día</h4>
            </div>

            {cajaAbierta.transacciones.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl block mb-2">receipt_long</span>
                <p>No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Concepto</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cajaAbierta.transacciones.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(tx.fecha)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{tx.concepto}</td>
                        <td className="px-6 py-4">
                          <Badge variant={tx.tipo === 'ingreso' ? 'success' : 'error'}>
                            {tx.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold text-right ${tx.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.tipo === 'egreso' ? '-' : '+'}{formatCurrency(Number(tx.monto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && !cajaAbierta && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-amber-500 text-4xl block mb-2">point_of_sale</span>
            <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-1">Caja Cerrada</h4>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Debes abrir la caja antes de registrar ventas y movimientos.
            </p>
          </div>
        )}
      </div>

      {/* Modal Apertura */}
      <CrudModal open={modalApertura} onClose={() => setModalApertura(false)} title="Apertura de Caja">
        <form onSubmit={abrirCaja} className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center mb-2">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Cajero</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.nombre || 'Usuario'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Fecha</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fechaHoy}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID Caja *</label>
            <input required value={formApertura.id_caja}
              onChange={(e) => setFormApertura({ ...formApertura, id_caja: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Ej: CAJA-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial *</label>
            <input type="number" step="0.01" min="0" required value={formApertura.saldo_inicial}
              onChange={(e) => setFormApertura({ ...formApertura, saldo_inicial: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda</label>
            <select value={formApertura.moneda} onChange={(e) => setFormApertura({ ...formApertura, moneda: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="USD">USD - Dólar Americano</option>
              <option value="PEN">PEN - Sol Peruano</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observaciones</label>
            <textarea value={formApertura.observaciones} onChange={(e) => setFormApertura({ ...formApertura, observaciones: e.target.value })}
              rows={3} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalApertura(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              Abrir Caja
            </button>
          </div>
        </form>
      </CrudModal>

      {/* Modal Movimiento Rediseñado */}
      <CrudModal open={modalMovimiento} onClose={() => setModalMovimiento(false)} title="Registro de Movimiento de Caja" size="xl">
        <div className="space-y-6">
          <form onSubmit={registrarMovimiento} className="space-y-6">
            {/* Datos Generales */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">database</span>
                <h5 className="font-bold text-slate-900 dark:text-white">Datos Generales</h5>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">ID Movimiento</label>
                    <input readOnly value={formMovimiento.id_movimiento}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">ID Caja</label>
                    <select value={formMovimiento.id_caja} onChange={(e) => setFormMovimiento({ ...formMovimiento, id_caja: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Seleccione Caja</option>
                      <option value="Caja Central (CJ-01)">Caja Central (CJ-01)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Tipo Movimiento</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {['ingreso', 'egreso'].map((t) => (
                        <button key={t} type="button" onClick={() => setFormMovimiento({ ...formMovimiento, tipo: t })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${formMovimiento.tipo === t
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Fecha Movimiento</label>
                    <div className="relative">
                      <input type="date" value={formMovimiento.fecha} onChange={(e) => setFormMovimiento({ ...formMovimiento, fecha: e.target.value })}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Usuario Movimiento</label>
                    <input readOnly value={formMovimiento.usuario}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Concepto</label>
                    <input required value={formMovimiento.concepto} onChange={(e) => setFormMovimiento({ ...formMovimiento, concepto: e.target.value })}
                      placeholder="Ej: Pago de servicios / Venta mostrador"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Estado</label>
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-bold text-green-600 dark:text-green-500">{formMovimiento.estado}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Importe Total</label>
                    <input readOnly value={formMovimiento.monto.toFixed(2)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Moneda</label>
                    <select value={formMovimiento.moneda} onChange={(e) => setFormMovimiento({ ...formMovimiento, moneda: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none font-medium">
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="PEN">PEN - Sol Peruano</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose Monetario */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">payments</span>
                  <h5 className="font-bold text-slate-900 dark:text-white">Desglose Monetario</h5>
                </div>
                <button type="button" onClick={addDesglose}
                  className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  AÑADIR LÍNEA
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800/50">
                      <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID Nominación</th>
                      <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center">Moneda</th>
                      <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider text-right">Importe</th>
                      <th className="px-6 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {desglose.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-3">
                          <input value={d.nominacion} onChange={(e) => updateDesglose(d.id, 'nominacion', e.target.value)}
                            placeholder="Ej: Billetes 100"
                            className="bg-transparent text-sm text-slate-600 dark:text-slate-300 outline-none w-full" />
                        </td>
                        <td className="px-6 py-3 text-center text-sm font-bold text-slate-900 dark:text-white uppercase">{d.moneda}</td>
                        <td className="px-6 py-3 text-right">
                          <input type="number" step="0.01" value={d.importe} onChange={(e) => updateDesglose(d.id, 'importe', parseFloat(e.target.value) || 0)}
                            className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none w-32 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary text-right" />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button type="button" onClick={() => removeDesglose(d.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-slate-50 items-center justify-end dark:bg-slate-800/10 flex gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUMA DESGLOSE:</span>
                <span className="text-lg font-black text-primary">{formMovimiento.monto.toFixed(2)} {formMovimiento.moneda}</span>
              </div>
            </div>

            {/* Información de Auditoría */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <span className="material-symbols-outlined text-lg">history</span>
                <h6 className="text-[10px] font-bold uppercase tracking-wider">Información de Auditoría</h6>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha Creación</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{fechaHoy} 10:45 AM</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Usuario Creación</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{user?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fecha Modificación</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">--/--/---- --:--</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Usuario Modificación</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">--</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end items-center pt-2">
              <button type="button" onClick={() => setModalMovimiento(false)}
                className="px-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-wider">
                CANCELAR
              </button>
              <button type="submit" disabled={saving}
                className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all flex items-center gap-2 uppercase tracking-wider">
                <span className="material-symbols-outlined text-lg">save</span>
                GUARDAR MOVIMIENTO
              </button>
            </div>
          </form>
        </div>
      </CrudModal>
    </div>
  )
}
