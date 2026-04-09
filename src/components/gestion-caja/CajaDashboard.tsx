'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import NuevoMovimientoDialog from './NuevoMovimientoDialog'
import CajaCierre from './CajaCierre'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Pagination from '@/components/ui/Pagination'

interface Props {
  session: any
  onClosed: () => void
}

export default function CajaDashboard({ session, onClosed }: Props) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewMov, setShowNewMov] = useState(false)
  const [showCierre, setShowCierre] = useState(false)
  
  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sessionTotals, setSessionTotals] = useState({ ingresos: 0, egresos: 0 })

  const safeFormat = (date: any, formatStr: string) => {
    try {
      if (!date) return '--:--'
      const d = new Date(date)
      if (isNaN(d.getTime())) return '--:--'
      return format(d, formatStr, { locale: es })
    } catch (e) {
      return '--:--'
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sesionCajaId: session.id,
        page: page.toString(),
        pageSize: pageSize.toString()
      })
      const res = await apiFetch(`/api/gestion-caja/transacciones?${params}`)
      const json = await res.json()
      setTransactions(json.data || [])
      setTotal(json.total || 0)
      if (json.totals) setSessionTotals(json.totals)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [session.id, page, pageSize])

  const totals = sessionTotals
  const montoInicial = Number(session.monto_apertura) || 0
  const saldoActual = montoInicial + (totals.ingresos || 0) - (totals.egresos || 0)

  const handleAnnul = async (id: number) => {
    const motivo = window.prompt('Motivo de anulación:')
    if (motivo === null) return

    try {
      const res = await apiFetch('/api/gestion-caja/transacciones', {
        method: 'POST',
        body: JSON.stringify({ 
          transaccion_anula_id: id, 
          motivo_anulacion: motivo,
          sesion_caja_id: session.id 
        })
      })
      if (res.ok) {
        toast.success('Movimiento anulado correctamente')
        fetchTransactions()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al anular')
      }
    } catch (error) {
      toast.error('Error de red')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Upper Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">point_of_sale</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
              {session.caja?.descripcion || 'Caja Registradora'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Sesión Activa</p>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <p className="text-[10px] uppercase font-bold text-slate-400">Desde: {safeFormat(session.fecha_apertura, 'HH:mm')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNewMov(true)}
            className="h-14 px-6 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Movimiento
          </button>
          <button 
            onClick={() => setShowCierre(true)}
            className="h-14 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            Cerrar Caja
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo Inicial" value={Number(session.monto_apertura)} icon="account_balance" color="blue" simbolo={session.moneda?.simbolo} />
        <StatCard label="Ingresos" value={totals.ingresos} icon="trending_up" color="emerald" simbolo={session.moneda?.simbolo} />
        <StatCard label="Egresos" value={totals.egresos} icon="trending_down" color="red" simbolo={session.moneda?.simbolo} />
        <StatCard label="Saldo en Caja" value={saldoActual} icon="payments" color="primary" highlight simbolo={session.moneda?.simbolo} />
      </div>

      {/* Transactions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Historial de Movimientos</h3>
           <button onClick={fetchTransactions} className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-colors">
              <span className={cn("material-symbols-outlined text-slate-400 text-lg", loading && "animate-spin")}>refresh</span>
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha/Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Concepto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Importe</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right" style={{ width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                          {safeFormat(t.created_at, 'dd/MM/yyyy')}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                          {safeFormat(t.created_at, 'HH:mm')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.concepto?.descripcion}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">
                             {t.cliente?.nombre || t.proveedor?.nombre || t.persona || 'Operación General'}
                           </span>
                           <span className="text-slate-200 dark:text-slate-800">•</span>
                           <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{t.motivo || t.numero_documento || 'Sin detalle'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-black tabular-nums whitespace-nowrap px-3 py-1 rounded-full",
                        Number(t.importe) >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" : "text-red-600 bg-red-50 dark:bg-red-500/10"
                      )}>
                        {Number(t.importe) >= 0 ? '+' : '-'}{Math.abs(Number(t.importe)).toFixed(2)} {t.moneda?.abreviatura}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                        t.estado === 'A' ? "bg-slate-200 text-slate-500" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {t.estado === 'A' ? 'Anulado' : 'Procesado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.estado === 'P' && !t.transaccion_anula_id && (
                        <button 
                          onClick={() => handleAnnul(t.id)}
                          className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center mx-auto -mr-1"
                          title="Anular Movimiento"
                        >
                          <span className="material-symbols-outlined text-lg">block</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium italic text-xs">
                     No se han registrado movimientos en esta sesión.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="bg-slate-50/30 dark:bg-slate-950/20">
            <Pagination 
              page={page} 
              totalPages={Math.ceil(total / pageSize)} 
              onPage={setPage}
              pageSize={pageSize} 
              onPageSize={(s) => { setPageSize(s); setPage(1) }} 
              total={total} 
            />
          </div>
        )}
      </div>

      {showNewMov && (
        <NuevoMovimientoDialog 
          session={session} 
          onClose={() => setShowNewMov(false)} 
          onSaved={() => {
            setShowNewMov(false)
            fetchTransactions()
          }}
        />
      )}

      {showCierre && (
        <CajaCierre 
          session={{ ...session, saldoActual }} 
          onClose={() => setShowCierre(false)} 
          onSuccess={onClosed}
        />
      )}

    </div>
  )
}

function StatCard({ label, value, icon, color, highlight, simbolo = '$' }: any) {
  const colors: any = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    primary: 'bg-primary text-white border-primary shadow-2xl shadow-primary/20',
  }

  return (
    <div className={cn(
      "p-4 rounded-3xl border transition-all hover:scale-[1.02] flex items-center gap-4",
      colors[color] || 'bg-white text-slate-900 border-slate-100',
      !highlight && "bg-white dark:bg-slate-900"
    )}>
      <div className={cn(
        "size-12 rounded-2xl flex items-center justify-center shrink-0",
        highlight ? "bg-white/20" : colors[color].split(' ')[0]
      )}>
        <span className={cn("material-symbols-outlined text-2xl", highlight ? "text-white" : colors[color].split(' ')[1])}>
          {icon}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-60", highlight && "text-white/80")}>
          {label}
        </p>
        <h3 className="text-lg font-black tracking-tight tabular-nums truncate">
          <span className="text-sm mr-1 opacity-50 font-bold">{simbolo}</span>
          {(Number(value) || 0).toFixed(2)}
        </h3>
      </div>
    </div>
  )
}
