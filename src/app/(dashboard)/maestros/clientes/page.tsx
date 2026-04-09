'use client'

import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/layout/Topbar'
import DataTable from '@/components/ui/DataTable'
import { useRouter } from 'next/navigation'
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

export default function ClientesPage() {
  const router = useRouter()
  const [data, setData] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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
    router.push('/maestros/clientes/nuevo')
  }

  function openEdit(c: Cliente) {
    router.push(`/maestros/clientes/editar/${c.id}`)
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
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Catálogo de Clientes" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
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
    </div>
  )
}
