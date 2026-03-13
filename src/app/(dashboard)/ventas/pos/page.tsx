'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import { formatCurrency, generateOrderNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Material {
  id: number
  codigo: string
  descripcion: string
  precio_venta: number
  stock_actual: number
  imagen_url?: string
  categoria?: string
  tipo: string
  impuesto?: { porcentaje: number } | null
}

interface CartItem {
  material: Material
  cantidad: number
  precio_unit: number
  subtotal: number
  impuesto: number
}

export default function POSPage() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [cupon, setCupon] = useState('')
  const [descuentoCupon, setDescuentoCupon] = useState(0)

  const fetchMateriales = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, pageSize: '50', page: '1' })
    const res = await apiFetch(`/api/materiales?${params}`)
    const json = await res.json()
    setMateriales((json.data ?? []).filter((m: Material) => m.stock_actual > 0))
    setLoading(false)
  }, [search])

  useEffect(() => { fetchMateriales() }, [fetchMateriales])

  function addToCart(material: Material) {
    setCart((prev) => {
      const existing = prev.find((i) => i.material.id === material.id)
      const impPct = Number(material.impuesto?.porcentaje ?? 0) / 100
      const precio = Number(material.precio_venta)
      if (existing) {
        const newQty = existing.cantidad + 1
        if (newQty > Number(material.stock_actual)) { toast.error('Stock insuficiente'); return prev }
        return prev.map((i) =>
          i.material.id === material.id
            ? { ...i, cantidad: newQty, subtotal: precio * newQty, impuesto: precio * newQty * impPct }
            : i
        )
      }
      return [...prev, {
        material,
        cantidad: 1,
        precio_unit: precio,
        subtotal: precio,
        impuesto: precio * impPct,
      }]
    })
  }

  function updateQty(materialId: number, qty: number) {
    if (qty <= 0) { removeFromCart(materialId); return }
    const mat = materiales.find((m) => m.id === materialId)
    if (mat && qty > Number(mat.stock_actual)) { toast.error('Stock insuficiente'); return }
    setCart((prev) =>
      prev.map((i) => {
        if (i.material.id !== materialId) return i
        const impPct = Number(i.material.impuesto?.porcentaje ?? 0) / 100
        return { ...i, cantidad: qty, subtotal: i.precio_unit * qty, impuesto: i.precio_unit * qty * impPct }
      })
    )
  }

  function removeFromCart(materialId: number) {
    setCart((prev) => prev.filter((i) => i.material.id !== materialId))
  }

  const subtotal = cart.reduce((a, i) => a + i.subtotal, 0)
  const totalImpuesto = cart.reduce((a, i) => a + i.impuesto, 0)
  const total = subtotal + totalImpuesto - descuentoCupon

  async function applyCupon() {
    if (!cupon.trim()) return
    toast.loading('Validando cupón...')
    // Mock: in production check against /api/cupones/validate
    if (cupon.toUpperCase() === 'DESC10') {
      setDescuentoCupon(subtotal * 0.10)
      toast.dismiss()
      toast.success('Cupón aplicado: 10% de descuento')
    } else {
      toast.dismiss()
      toast.error('Cupón inválido o expirado')
    }
  }

  async function procesarVenta(estado: 'procesada' | 'cotizacion') {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return }
    setProcessing(true)
    try {
      const res = await apiFetch('/api/ventas', {
        method: 'POST',
        body: JSON.stringify({
          numero_pedido: generateOrderNumber(),
          estado,
          subtotal,
          impuesto: totalImpuesto,
          descuento: descuentoCupon,
          total,
          metodo_pago: 'efectivo',
          detalles: cart.map((i) => ({
            material_id: i.material.id,
            cantidad: i.cantidad,
            precio_unit: i.precio_unit,
            descuento: 0,
            impuesto: i.impuesto,
            subtotal: i.subtotal,
          })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(estado === 'procesada' ? '¡Venta procesada exitosamente!' : 'Cotización guardada')
      setCart([])
      setCupon('')
      setDescuentoCupon(0)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setProcessing(false)
    }
  }

  const filteredMateriales = materiales.filter((m) =>
    m.descripcion.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Punto de Venta" />

      <div className="flex-1 flex overflow-hidden">
        {/* Products grid */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por código o nombre..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          {loading ? (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start overflow-y-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 animate-pulse border border-slate-200 dark:border-slate-800">
                  <div className="w-full h-28 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start overflow-y-auto pb-4">
              {filteredMateriales.map((m) => (
                <button key={m.id} onClick={() => addToCart(m)}
                  className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left group">
                  <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {m.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imagen_url} alt={m.descripcion} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-slate-300">inventory_2</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-0.5">{m.codigo}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                    {m.descripcion}
                  </p>
                  <p className="text-base font-bold text-primary">{formatCurrency(Number(m.precio_venta))}</p>
                  <p className="text-xs text-slate-400 mt-1">Stock: {Number(m.stock_actual)}</p>
                </button>
              ))}

              {filteredMateriales.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                  <p>No se encontraron productos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                Carrito
              </h3>
              {cart.length > 0 && (
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-4xl block mb-2">shopping_cart</span>
                <p className="text-sm">Selecciona productos del catálogo</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.material.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.material.descripcion}
                      </p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.precio_unit)} c/u</p>
                    </div>
                    <button onClick={() => removeFromCart(item.material.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.material.id, item.cantidad - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.cantidad}</span>
                      <button onClick={() => updateQty(item.material.id, item.cantidad + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals and actions */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Coupon */}
              <div className="flex gap-2">
                <input value={cupon} onChange={(e) => setCupon(e.target.value.toUpperCase())}
                  placeholder="Código de cupón"
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
                <button onClick={applyCupon}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                  Aplicar
                </button>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Impuesto</span>
                  <span>{formatCurrency(totalImpuesto)}</span>
                </div>
                {descuentoCupon > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento cupón</span>
                    <span>-{formatCurrency(descuentoCupon)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => procesarVenta('cotizacion')} disabled={processing}
                  className="py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors disabled:opacity-60">
                  Cotización
                </button>
                <button onClick={() => procesarVenta('procesada')} disabled={processing}
                  className="py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-1">
                  {processing ? (
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-base">payments</span>
                  )}
                  Cobrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
