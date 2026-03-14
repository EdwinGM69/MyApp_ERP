'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import CrudModal from '@/components/ui/CrudModal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface Proveedor {
  id: number
  codigo: string
  tipo: string
  tipo_proveedor: string
  nombre: string
  categoria?: string
  tipo_nif?: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  banco?: string
  tipo_cuenta?: string
  banco_cuenta?: string
  banco_swift?: string
  banco_titular?: string
  activo: boolean
  created_at?: string
  created_by?: number
  updated_at?: string
  updated_by?: number
}

const EMPTY: Omit<Proveedor, 'id' | 'activo'> = {
  codigo: '', tipo: 'empresa', tipo_proveedor: 'Nacional', nombre: '', categoria: '', tipo_nif: '', nif: '', email: '', telefono: '', direccion: '', banco: '', tipo_cuenta: '', banco_cuenta: '', banco_swift: '', banco_titular: ''
}

export default function ProveedoresPage() {
  const [data, setData] = useState<Proveedor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Proveedor | null>(null)
  const [form, setForm] = useState<Omit<Proveedor, 'id' | 'activo'>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await apiFetch(`/api/proveedores?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setSelected(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(p: Proveedor) {
    setSelected(p)
    setForm({ 
      codigo: p.codigo, 
      tipo: p.tipo, 
      tipo_proveedor: p.tipo_proveedor,
      nombre: p.nombre, 
      categoria: p.categoria ?? '', 
      tipo_nif: p.tipo_nif ?? '',
      nif: p.nif ?? '', 
      email: p.email ?? '', 
      telefono: p.telefono ?? '', 
      direccion: p.direccion ?? '',
      banco: p.banco ?? '',
      tipo_cuenta: p.tipo_cuenta ?? '',
      banco_cuenta: p.banco_cuenta ?? '',
      banco_swift: p.banco_swift ?? '',
      banco_titular: p.banco_titular ?? ''
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch('/api/proveedores', {
        method: selected ? 'PUT' : 'POST',
        body: JSON.stringify(selected ? { id: selected.id, ...form } : form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selected ? 'Proveedor actualizado' : 'Proveedor creado')
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Proveedor) {
    if (!confirm(`¿Desactivar a ${p.nombre}?`)) return
    const res = await apiFetch('/api/proveedores', { method: 'DELETE', body: JSON.stringify({ id: p.id }) })
    if (res.ok) { toast.success('Proveedor desactivado'); fetchData() }
    else toast.error('Error al desactivar')
  }

  const columns = [
    { key: 'codigo', header: 'ID', width: 'w-24' },
    {
      key: 'nombre', header: 'NOMBRE DEL PROVEEDOR',
      render: (r: Proveedor) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">
              {r.tipo === 'empresa' ? 'business' : 'person'}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{r.nombre}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'CORREO ELECTRÓNICO', render: (r: Proveedor) => r.email || <span className="text-slate-400">—</span> },
    { key: 'telefono', header: 'TELÉFONO', render: (r: Proveedor) => r.telefono || <span className="text-slate-400">—</span> },
    {
      key: 'categoria', header: 'CATEGORÍA',
      render: (r: Proveedor) => (
        <Badge variant="neutral">
          {r.categoria || 'Sin Categoría'}
        </Badge>
      ),
    },
    {
      key: 'activo', header: 'ESTADO',
      render: (r: Proveedor) => <Badge variant={r.activo ? 'success' : 'neutral'}>{r.activo ? '● Activo' : '● Inactivo'}</Badge>,
    },
    {
      key: 'actions', header: 'ACCIONES',
      render: (r: Proveedor) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors" title="Editar">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors" title="Desactivar">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Catálogo de Proveedores" />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Catálogo de Proveedores
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona la base de datos de tus proveedores y sus categorías.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Agregar Nuevo Proveedor
          </button>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre, código o categoría..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron proveedores" />
        </div>

        <div className="mt-4 bg-white rounded-xl border border-slate-100 p-2 shadow-sm">
          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize) || 1}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            total={total}
          />
        </div>
      </div>

      {/* CRUD Modal */}
      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Información del Proveedor */}
          <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-500">domain</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Información del Proveedor</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de proveedor *</label>
                <select value={form.tipo_proveedor} onChange={(e) => setForm({ ...form, tipo_proveedor: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="Nacional">Nacional</option>
                  <option value="Internacional">Internacional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Razón social *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value, codigo: form.codigo || `PROV-${Date.now()}` })}
                  placeholder="Nombre completo de la empresa"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo NIF</label>
                <select value={form.tipo_nif} onChange={(e) => setForm({ ...form, tipo_nif: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="">Seleccione...</option>
                  <option value="NIT">NIT</option>
                  <option value="RUT">RUT</option>
                  <option value="CEDULA">Cédula</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 border-l border-transparent">
                <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Número NIF</label>
                   <input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })}
                    placeholder="000.000.000-0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                   <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="">Seleccione...</option>
                    <option value="Materia Prima">Materia Prima</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Logística">Logística</option>
                    <option value="Otros">Otros</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@proveedor.com"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+57 300 000 0000"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Información Bancaria */}
          <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-500">account_balance</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Información Bancaria</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banco</label>
                <select value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="">Seleccione...</option>
                  <option value="Bancolombia">Bancolombia</option>
                  <option value="Davivienda">Davivienda</option>
                  <option value="Banco de Bogotá">Banco de Bogotá</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Cuenta</label>
                <select value={form.tipo_cuenta} onChange={(e) => setForm({ ...form, tipo_cuenta: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="">Seleccione...</option>
                  <option value="Ahorros">Ahorros</option>
                  <option value="Corriente">Corriente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Número de Cuenta</label>
                <input value={form.banco_cuenta} onChange={(e) => setForm({ ...form, banco_cuenta: e.target.value })}
                  placeholder="000-000000-00"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Titular de la Cuenta</label>
                <input value={form.banco_titular} onChange={(e) => setForm({ ...form, banco_titular: e.target.value })}
                  placeholder="Nombre completo del titular"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SWIFT/BIC (Opcional)</label>
                <input value={form.banco_swift} onChange={(e) => setForm({ ...form, banco_swift: e.target.value })}
                  placeholder="Código SWIFT"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Estado y Auditoría */}
          <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-500">public</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Estado y Auditoría</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                <select 
                  value={selected ? (selected.activo ? "Activo" : "Inactivo") : "Activo"} 
                  disabled 
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              
              {selected ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha creación</label>
                    <input disabled value={selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '--'}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  {/* Nota: En el diseño original, se ve un "Usuario creación". Como nuestro schema no cruza directamente el nombre aquí sin joins complejos, mostraremos el ID o un mock por ahora */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuario creación</label>
                    <input disabled value={selected.created_by ? `User_ID_${selected.created_by}` : '--'}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha de modificación</label>
                    <input disabled value={selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : '--'}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuario de modificación</label>
                    <input disabled value={selected.updated_by ? `User_ID_${selected.updated_by}` : '--'}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha creación</label>
                    <input disabled value={new Date().toLocaleDateString()}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuario creación</label>
                    <input disabled value="-- (Pendiente)"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha de modificación</label>
                    <input disabled value="--"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuario de modificación</label>
                    <input disabled value="--"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Historial de Suministros (Ejemplo UI) */}
          {selected && (
            <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Historial de Suministros</h4>
                </div>
                <button type="button" className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  Exportar a PDF
                </button>
              </div>
              <div className="text-center py-6 text-sm text-slate-400">
                Aún no hay suministros registrados para este proveedor.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={() => setModalOpen(false)}
              className="py-2 px-6 rounded-lg border border-slate-300 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="py-2 px-6 rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              {saving && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              <span className="material-symbols-outlined text-sm">save</span>
              {selected ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  )
}
