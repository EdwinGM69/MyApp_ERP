'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function FinalPage() {
  const router = useRouter()
  const [loadingDemo, setLoadingDemo] = useState(false)

  async function handleExplorarDemo() {
    if (loadingDemo) return

    setLoadingDemo(true)
    try {
      const res = await fetch('/api/onboarding/demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const contentType = res.headers.get('content-type') || ''
      let data: any = {}

      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        console.error('[DEMO] Respuesta no-JSON recibida:', res.status, text.substring(0, 300))
        throw new Error(`Error en el servidor (${res.status}). Por favor intente más tarde.`)
      }

      if (!res.ok) throw new Error(data.error || 'Error al cargar los datos de prueba')

      toast.success('¡Datos de prueba cargados!')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoadingDemo(false)
    }
  }

  function handleIrLogistica() {
    // Módulo de Logística: maestros definitivos (marcas)
    router.push('/maestros/logistica/marcas')
  }

  const cardBase =
    'bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col'

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Heading */}
      <div className="text-center mb-8">
        <h2 className="text-emerald-400 text-lg font-semibold mb-2">¡Felicidades!</h2>
        <h1 className="text-white text-3xl font-extrabold mb-3 leading-tight">
          ¡Tu sistema comercial está listo!
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Has completado la configuración inicial. Ahora, ¿cómo te gustaría empezar a
          explorar KAMAQ ONE?
        </p>
      </div>

      {/* Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Card 1: Demo data */}
        <div className={cardBase}>
          <h3 className="text-white text-base font-bold mb-3">
            Quiero explorar con datos de prueba
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-5">
            El sistema se llenará con 5 productos y caja abierta para que puedas simular
            ventas inmediatamente sin alterar tu inventario real.
          </p>
          <button
            onClick={handleExplorarDemo}
            disabled={loadingDemo}
            className="inline-flex items-center gap-1 text-primary hover:text-blue-400 font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed self-start"
          >
            {loadingDemo ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                Cargando datos...
              </>
            ) : (
              'Explorar demo ->'
            )}
          </button>
        </div>

        {/* Card 2: Real product */}
        <div className={cardBase}>
          <h3 className="text-white text-base font-bold mb-3">
            Quiero registrar mi primer producto real
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-5">
            Te llevamos al módulo de Logística para empezar a configurar los maestros
            definitivos y preparar tu negocio para operar.
          </p>
          <button
            onClick={handleIrLogistica}
            className="inline-flex items-center gap-1 text-primary hover:text-blue-400 font-bold text-sm transition-colors self-start"
          >
            Ir a Logística -&gt;
          </button>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs mt-6">
        ERP/POS Pro v1.0 — © 2025 Todos los derechos reservados
      </p>
    </div>
  )
}
