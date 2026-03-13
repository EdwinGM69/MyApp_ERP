'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import CrudModal from '@/components/ui/CrudModal'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface Cliente {
  id: number
  codigo: string
  tipo: string
  nombre: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  contacto?: string
  activo: boolean
}

const EMPTY: Omit<Cliente, 'id' | 'activo'> = {
  codigo: '', tipo: 'natural', nombre: '', nif: '', email: '', telefono: '', direccion: '', contacto: '',
}

export default function ClientesPage() {
  const [data, setData] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [form, setForm] = useState<Omit<Cliente, 'id' | 'activo'>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
    const res = await apiFetch(`/api/clientes?${params}`)
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

  function openEdit(c: Cliente) {
    setSelected(c)
    setForm({ codigo: c.codigo, tipo: c.tipo, nombre: c.nombre, nif: c.nif ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '', contacto: c.contacto ?? '' })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch('/api/clientes', {
        method: selected ? 'PUT' : 'POST',
        body: JSON.stringify(selected ? { id: selected.id, ...form } : form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(selected ? 'Cliente actualizado' : 'Cliente creado')
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Cliente) {
    if (!confirm(`¿Desactivar a ${c.nombre}?`)) return
    const res = await apiFetch('/api/clientes', { method: 'DELETE', body: JSON.stringify({ id: c.id }) })
    if (res.ok) { toast.success('Cliente desactivado'); fetchData() }
    else toast.error('Error al desactivar')
  }

  const columns = [
    { key: 'codigo', header: 'Código', width: 'w-24' },
    {
      key: 'nombre', header: 'Nombre del Cliente',
      render: (r: Cliente) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">
              {r.tipo === 'empresa' ? 'business' : 'person'}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{r.nombre}</p>
            {r.nif && <p className="text-xs text-slate-400">NIF: {r.nif}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Correo Electrónico', render: (r: Cliente) => r.email || <span className="text-slate-400">—</span> },
    { key: 'telefono', header: 'Teléfono', render: (r: Cliente) => r.telefono || <span className="text-slate-400">—</span> },
    {
      key: 'tipo', header: 'Tipo',
      render: (r: Cliente) => (
        <Badge variant={r.tipo === 'empresa' ? 'info' : 'neutral'}>
          {r.tipo === 'empresa' ? 'Empresa' : 'Persona Natural'}
        </Badge>
      ),
    },
    {
      key: 'activo', header: 'Estado',
      render: (r: Cliente) => <Badge variant={r.activo ? 'success' : 'error'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'actions', header: 'Acciones',
      render: (r: Cliente) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors" title="Editar">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors" title="Desactivar">
            <span className="material-symbols-outlined text-base">person_off</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Catálogo de Clientes" />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Catálogo de Clientes
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona la base de datos de tus compradores y sus categorías.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            Agregar Nuevo Cliente
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
              placeholder="Buscar por nombre, código o NIF..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No se encontraron clientes" />

        <Pagination
          page={page}
          totalPages={Math.ceil(total / pageSize)}
          onPage={setPage}
          pageSize={pageSize}
          onPageSize={(s) => { setPageSize(s); setPage(1) }}
          total={total}
        />
      </div>

      {/* CRUD Modal */}
      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código *</label>
              <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="natural">Persona Natural</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {form.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Completo *'}
            </label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIF / RUC</label>
              <input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          {form.tipo === 'empresa' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Persona de Contacto</label>
              <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              {selected ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </CrudModal>
    </div>
  )
}
