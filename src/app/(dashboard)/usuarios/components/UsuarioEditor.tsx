'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Sucursal {
  id: number
  descripcion: string
  empresa_id: number
}

interface Rol {
  id: number
  nombre: string
  activo: boolean
}

interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  posicion?: string | null
  two_factor_enabled: boolean
  preferencias?: any
  rol_id: number
  rol: {
    id: number
    nombre: string
  }
  roles_adicionales?: {
    rol_id: number
    rol: {
      nombre: string
    }
  }[]
  activo: boolean
  avatar_url?: string | null
  updated_at: string
  usuario_sucursales?: { sucursal_id: number; sucursal?: { id: number; descripcion: string } }[]
  sucursales_asignadas?: { sucursal_id: number }[]
}

interface UsuarioEditorProps {
  usuario?: Usuario | null
  onCancel: () => void
  onSuccess: () => void
}

const defaultPreferences = {
  idioma: 'Español (ES)',
  zona_horaria: '(GMT +01:00) Madrid, España',
  notificaciones: {
    alertas_inventario: true,
    resumen_semanal: true,
    chat_interno: false,
    nuevas_promociones: true
  }
}

export default function UsuarioEditor({ usuario, onCancel, onSuccess }: UsuarioEditorProps) {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Rol[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [assignedSucursales, setAssignedSucursales] = useState<number[]>([])
  const [isSelectingSucursal, setIsSelectingSucursal] = useState(false)
  const [isSelectingRol, setIsSelectingRol] = useState(false)

  // Form fields
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [posicion, setPosicion] = useState('')
  const [assignedRoles, setAssignedRoles] = useState<number[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [idioma, setIdioma] = useState(defaultPreferences.idioma)
  const [zonaHoraria, setZonaHoraria] = useState(defaultPreferences.zona_horaria)
  const [notifInventario, setNotifInventario] = useState(defaultPreferences.notificaciones.alertas_inventario)
  const [notifSemanal, setNotifSemanal] = useState(defaultPreferences.notificaciones.resumen_semanal)
  const [notifChat, setNotifChat] = useState(defaultPreferences.notificaciones.chat_interno)
  const [notifPromociones, setNotifPromociones] = useState(defaultPreferences.notificaciones.nuevas_promociones)

  // Load auxiliary data
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await apiFetch('/api/roles')
        if (res.ok) {
          const json = await res.json()
          setRoles(json.data)
        }
      } catch (error) {
        console.error('Error fetching roles:', error)
      }
    }
    fetchRoles()

    async function fetchSucursales() {
      try {
        const res = await apiFetch('/api/sucursales')
        if (res.ok) {
          const json = await res.json()
          setSucursales(json.data || json)
        }
      } catch (error) {
        console.error('Error fetching sucursales:', error)
      }
    }
    fetchSucursales()
  }, [])

  // Load user data when editing
  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre || '')
      setEmail(usuario.email || '')
      setTelefono(usuario.telefono || '')
      setPosicion(usuario.posicion || '')

      const userRoles = [usuario.rol_id]
      if (usuario.roles_adicionales) {
        usuario.roles_adicionales.forEach(r => {
          if (!userRoles.includes(r.rol_id)) userRoles.push(r.rol_id)
        })
      }
      setAssignedRoles(userRoles)
      setTwoFactor(usuario.two_factor_enabled || false)

      if (usuario.usuario_sucursales && Array.isArray(usuario.usuario_sucursales)) {
        setAssignedSucursales(usuario.usuario_sucursales.map((s: any) => s.sucursal_id))
      } else if (usuario.sucursales_asignadas && Array.isArray(usuario.sucursales_asignadas)) {
        setAssignedSucursales(usuario.sucursales_asignadas.map((s: any) => s.sucursal_id))
      }

      const prefs = usuario.preferencias || defaultPreferences
      setIdioma(prefs.idioma || defaultPreferences.idioma)
      setZonaHoraria(prefs.zona_horaria || defaultPreferences.zona_horaria)

      const notifs = prefs.notificaciones || defaultPreferences.notificaciones
      setNotifInventario(Boolean(notifs.alertas_inventario ?? true))
      setNotifSemanal(Boolean(notifs.resumen_semanal ?? true))
      setNotifChat(Boolean(notifs.chat_interno ?? false))
      setNotifPromociones(Boolean(notifs.nuevas_promociones ?? true))
    } else {
      // Reset for new user
      setNombre('')
      setEmail('')
      setTelefono('')
      setPosicion('')
      setAssignedRoles([])
      setTwoFactor(false)
      setAssignedSucursales([])
      setNewPassword('')
      setConfirmPassword('')
      setIdioma(defaultPreferences.idioma)
      setZonaHoraria(defaultPreferences.zona_horaria)
      setNotifInventario(Boolean(defaultPreferences.notificaciones.alertas_inventario))
      setNotifSemanal(Boolean(defaultPreferences.notificaciones.resumen_semanal))
      setNotifChat(Boolean(defaultPreferences.notificaciones.chat_interno))
      setNotifPromociones(Boolean(defaultPreferences.notificaciones.nuevas_promociones))
    }
  }, [usuario])

  const handleAddRol = (rolId: number) => {
    if (!assignedRoles.includes(rolId)) {
      setAssignedRoles([...assignedRoles, rolId])
    }
  }

  const handleRemoveRol = (rolId: number) => {
    setAssignedRoles(assignedRoles.filter(id => id !== rolId))
  }

  const handleAddSucursal = (sucursalId: number) => {
    if (!assignedSucursales.includes(sucursalId)) {
      setAssignedSucursales([...assignedSucursales, sucursalId])
    }
  }

  const handleRemoveSucursal = (sucursalId: number) => {
    setAssignedSucursales(assignedSucursales.filter(id => id !== sucursalId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }

    setLoading(true)

    try {
      const mainRolId = assignedRoles.length > 0 ? assignedRoles[0] : roles[0]?.id
      const additionalRoles = assignedRoles.slice(1)

      if (!mainRolId) throw new Error("No hay roles disponibles en el sistema.")

      const payload: any = {
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono ? telefono.trim() : null,
        posicion: posicion ? posicion.trim() : null,
        two_factor_enabled: twoFactor,
        activo: true,
        rol_id: mainRolId,
        roles_adicionales: additionalRoles,
        sucursales_asignadas: assignedSucursales,
        preferencias: {
          idioma,
          zona_horaria: zonaHoraria,
          notificaciones: {
            alertas_inventario: notifInventario,
            resumen_semanal: notifSemanal,
            chat_interno: notifChat,
            nuevas_promociones: notifPromociones
          }
        }
      }

      if (newPassword) {
        payload.password = newPassword
      } else if (!usuario) {
        toast.error('La contraseña es requerida para un nuevo usuario')
        setLoading(false)
        return
      }

      const method = usuario ? 'PUT' : 'POST'
      const url = usuario ? `/api/usuarios/${usuario.id}` : '/api/usuarios'

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        let errorMessage = 'Error al guardar el usuario'
        const json = await res.json().catch(() => ({}))
        errorMessage = json.error || errorMessage
        throw new Error(errorMessage)
      }

      toast.success(usuario ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente')
      onSuccess()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error desconocido al guardar')
    } finally {
      setLoading(false)
    }
  }

  const availableRolesToAdd = roles.filter(r => !assignedRoles.includes(r.id) && r.activo)

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
            {usuario ? 'Actualizar Usuario' : 'Nuevo Usuario'}
          </h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Gestión de Usuarios</p>
        </div>
        <button
          onClick={onCancel}
          className="size-11 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo *</label>
            <input
              type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Juan Pérez"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico *</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="juan@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
            <input
              type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Posición</label>
            <input
              type="text" value={posicion} onChange={e => setPosicion(e.target.value)}
              className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-medium bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Gerente de Ventas"
            />
          </div>
        </div>

        {/* 2. Roles de Usuario */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Roles y Permisos</h3>
            <button type="button" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Configurar Permisos
            </button>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Roles de Acceso Asignados</p>
            <div className="flex flex-wrap gap-3 items-center">
              {assignedRoles.map(rolId => {
                const rol = roles.find(r => r.id === rolId)
                if (!rol) return null
                return (
                  <div key={rolId} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold shadow-sm group">
                    {rol.nombre}
                    <button type="button" onClick={() => handleRemoveRol(rolId)} className="text-blue-300 hover:text-red-500 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  </div>
                )
              })}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSelectingRol(!isSelectingRol)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 border-dashed text-slate-400 hover:border-blue-400 hover:text-blue-500 px-5 py-2 rounded-xl text-sm font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Asignar Rol
                </button>
                {isSelectingRol && availableRolesToAdd.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-60 z-20 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 pb-2 mb-2 border-b border-slate-50 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seleccionar Rol</p>
                    </div>
                    {availableRolesToAdd.map(rol => (
                      <button
                        key={rol.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        onClick={() => handleAddRol(rol.id)}
                      >
                        {rol.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">info</span>
              Un usuario puede tener múltiples roles para combinar diferentes niveles de acceso.
            </p>
          </div>
        </div>

        {/* Sucursales Asignadas */}
        <div className="space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Sucursales Asignadas</h3>

          <div>
            <div className="flex flex-wrap gap-3 items-center">
              {assignedSucursales.map(sucursalId => {
                const sucursal = sucursales.find(s => s.id === sucursalId)
                if (!sucursal) return null
                return (
                  <div key={sucursalId} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold shadow-sm group">
                    <span className="material-symbols-outlined text-[18px]">store</span>
                    {sucursal.descripcion}
                    <button type="button" onClick={() => handleRemoveSucursal(sucursalId)} className="text-emerald-300 hover:text-red-500 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  </div>
                )
              })}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSelectingSucursal(!isSelectingSucursal)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 border-dashed text-slate-400 hover:border-emerald-400 hover:text-emerald-500 px-5 py-2 rounded-xl text-sm font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Asignar Sucursal
                </button>
                {isSelectingSucursal && sucursales.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-60 z-20 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 pb-2 mb-2 border-b border-slate-50 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seleccionar Sucursal</p>
                    </div>
                    {sucursales
                      .filter(s => !assignedSucursales.includes(s.id))
                      .map(sucursal => (
                        <button
                          key={sucursal.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
                          onClick={() => handleAddSucursal(sucursal.id)}
                        >
                          <span className="material-symbols-outlined text-[18px]">store</span>
                          {sucursal.descripcion}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">info</span>
              Las sucursales asignadas determinan desde qué ubicaciones puede operar este usuario.
            </p>
          </div>
        </div>

        {/* Seguridad */}
        {!usuario && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña *</label>
              <input
                type="password" required={!usuario} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repetir Contraseña *</label>
              <input
                type="password" required={!usuario} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {usuario && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña (opcional)</label>
              <input
                type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repetir Nueva Contraseña</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-5 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Autenticación de Dos Factores</p>
            <p className="text-xs font-medium text-slate-500">Mejora la seguridad de la cuenta</p>
          </div>
          <input
            type="checkbox"
            checked={twoFactor}
            onChange={e => setTwoFactor(e.target.checked)}
            className="w-5 h-5 border-2 border-slate-300 rounded-lg cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-all"
          />
        </div>

        {/* Preferencias */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idioma</label>
            <select
              value={idioma}
              onChange={e => setIdioma(e.target.value)}
              className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option>Español (ES)</option>
              <option>English (US)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zona Horaria</label>
            <select
              value={zonaHoraria}
              onChange={e => setZonaHoraria(e.target.value)}
              className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option>(GMT +01:00) Madrid, España</option>
              <option>(GMT -05:00) Bogotá, Colombia</option>
              <option>(GMT -06:00) Ciudad de México</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Canales de Notificación</label>
          <div className="space-y-5">
            {[
              { id: 'inv', label: 'Alertas de inventario bajo', checked: notifInventario, set: setNotifInventario },
              { id: 'sem', label: 'Resumen semanal de actividad', checked: notifSemanal, set: setNotifSemanal },
              { id: 'chat', label: 'Mensajes de chat interno', checked: notifChat, set: setNotifChat },
              { id: 'prom', label: 'Lanzamiento de nuevas promociones', checked: notifPromociones, set: setNotifPromociones }
            ].map(n => (
              <label key={n.id} className="flex items-center gap-4 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
                    className="peer w-5 h-5 border-2 border-slate-300 rounded-md cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-all"
                    checked={n.checked}
                    onChange={e => n.set(e.target.checked)}
                  />
                  <span className="material-symbols-outlined absolute text-white text-[14px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{n.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="w-48 h-12 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
            ) : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}