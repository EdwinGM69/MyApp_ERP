'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/hooks/useAuth'
import Topbar from '@/components/layout/Topbar'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { usePermisos } from '@/contexts/PermisosContext'
import * as XLSX from 'xlsx'
import ImportingOverlay from '@/components/ui/ImportingOverlay'

interface Tipo {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
}

export default function TiposPage() {
  const router = useRouter()
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const permisos = usePermisos()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importTotal, setImportTotal] = useState(0)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false)
      }
    }
    if (showNewMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNewMenu])

  const fetchTipos = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/materiales/tipos?page=${page}&pageSize=${pageSize}&search=${search}`)
      const json = await res.json()
      setTipos(json.data || [])
      setTotal(json.total || 0)
    } catch (error) {
      toast.error('Error al cargar tipos de material')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTipos()
  }, [page, pageSize, search])

  const handleCreate = () => {
    router.push('/maestros/logistica/tipos-material/nuevo')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets['Datos']
      if (!sheet) {
        toast.error('La plantilla debe tener una pestaña llamada "Datos".')
        return
      }

      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 }) as any[][]

      if (rows.length < 3) {
        toast.error('La plantilla debe tener al menos 3 filas (encabezados en fila 3).')
        return
      }

      const headers = rows[2] as string[]
      const fieldIndex: Record<string, number> = {}
      headers.forEach((h, idx) => {
        if (h) fieldIndex[String(h).trim()] = idx
      })

      const requiredFields = ['codigo', 'descripcion']
      for (const field of requiredFields) {
        if (!(field in fieldIndex)) {
          toast.error(`La plantilla debe contener la columna "${field}".`)
          return
        }
      }

      const tipos: any[] = []
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.every((cell: any) => cell === undefined || cell === null || cell === '')) continue

        const item: any = {}
        for (const [field, idx] of Object.entries(fieldIndex)) {
          let val = row[idx]
          if (val === undefined || val === null) continue
          item[field] = String(val).trim()
        }

        tipos.push(item)
      }

      if (tipos.length === 0) {
        toast.error('No se encontraron datos para importar.')
        return
      }

      setImportTotal(tipos.length)

      const res = await apiFetch('/api/materiales/tipos/import', {
        method: 'POST',
        body: JSON.stringify({ tipos }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Error al importar tipos de material.')
        return
      }

      if (result.created > 0) {
        toast.success(`Se crearon ${result.created} tipo(s) correctamente.`)
      }

      if (result.errors?.length > 0) {
        const msgs = result.errors.slice(0, 5).map(
          (e: any) => `Fila ${e.row}: ${e.error}`
        )
        if (result.errors.length > 5) {
          msgs.push(`... y ${result.errors.length - 5} error(es) más.`)
        }
        toast.error(
          <div>
            <strong>Errores de importación:</strong>
            {msgs.map((m: string, i: number) => (
              <div key={i} className="text-sm">{m}</div>
            ))}
          </div>,
          { duration: 6000 }
        )
      }

      fetchTipos()
    } catch (err: any) {
      toast.error(`Error al procesar el archivo: ${err.message}`)
    } finally {
      setImporting(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleEdit = (tipo: Tipo) => {
    router.push(`/maestros/logistica/tipos-material/editar/${tipo.id}`)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este tipo de material?')) return
    try {
      const res = await apiFetch(`/api/materiales/tipos?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Tipo de material desactivado')
        fetchTipos()
      }
    } catch (error) {
      toast.error('Error al desactivar tipo de material')
    }
  }

  const columns: Column<Tipo>[] = [
    { 
      key: 'codigo', 
      header: 'ID',
      width: 'w-24',
      render: (t: Tipo) => <span className="text-slate-500 font-mono text-xs">{t.codigo}</span>
    },
    { 
      key: 'descripcion', 
      header: 'DESCRIPCIÓN DEL TIPO',
      render: (t: Tipo) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-blue-600">
              inventory_2
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">{t.descripcion}</span>
        </div>
      )
    },
    { 
      key: 'activo', 
      header: 'ESTADO',
      render: (t: Tipo) => (
        <Badge variant={t.activo ? 'success' : 'neutral'}>
          {t.activo ? '● Activo' : '● Inactivo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'ACCIONES',
      align: 'right',
      render: (t: Tipo) => (
        <div className="flex items-center gap-1 justify-end">
          {permisos.editar && (
            <button
              onClick={() => handleEdit(t)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {permisos.borrar && (
            <button
              onClick={() => handleDelete(t.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
              title="Desactivar"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <Topbar title="Gestión de Tipos de Material" />

      <div className="flex-1 overflow-y-auto p-8 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Tipos de Material
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Administra los tipos de materiales para clasificar adecuadamente tus productos e insumos.
            </p>
          </div>
          {permisos.crear && (
            <div ref={newMenuRef} className="relative shrink-0">
              <div className="flex items-center">
                <button onClick={handleCreate}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 pl-5 pr-4 rounded-l-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-xl">add</span>
                  Nuevo Tipo
                </button>
                <button onClick={() => setShowNewMenu(v => !v)}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-2.5 rounded-r-xl border-l border-white/20 transition-all shadow-lg shadow-primary/20 flex items-center">
                  <span className={`material-symbols-outlined text-xl transition-transform ${showNewMenu ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
              </div>

              {showNewMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Modalidad de creación</p>
                  </div>

                  <button
                    onClick={() => { setShowNewMenu(false); handleCreate() }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3 group">
                    <span className="material-symbols-outlined text-primary text-xl mt-0.5">edit_note</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Crear manualmente</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-tight">Formulario</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Ingresa código, nombre y detalles…</p>
                    </div>
                  </button>

                  {permisos.importar && (
                    <button
                      onClick={() => { setShowNewMenu(false); fileInputRef.current?.click() }}
                      disabled={importing}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3 group disabled:opacity-50">
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5">file_upload</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{importing ? 'Importando...' : 'Importar'}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Excel / CSV</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Carga masiva desde archivo de cálculo o…</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-0">
          <DataTable
            columns={columns}
            data={tipos}
            loading={loading}
            emptyMessage="No se encontraron tipos de material registrados"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize)}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); setPage(1); }}
            total={total}
          />
        </div>
      </div>
      {importing && (
        <ImportingOverlay
          label="Importando tipos de material"
          count={importTotal}
          icon="inventory_2"
        />
      )}
    </div>
  )
}
