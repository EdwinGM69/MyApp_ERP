'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Sucursal {
  id: number
  descripcion: string
  empresa_id: number
}

interface Rol {
  id: number
  nombre: string
}

interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  posicion?: string | null
  is_superadmin: boolean
  two_factor_enabled: boolean
  preferencias?: any
  last_sucursal_id?: number | null
  rol_id: number
  rol: { nombre: string }
  roles_adicionales?: { rol_id: number, rol: { nombre: string } }[]
  activo: boolean
  avatar_url?: string | null
  sucursales_asignadas?: { sucursal_id: number }[]
  usuario_sucursales?: { sucursal_id: number; sucursal?: { id: number; descripcion: string } }[]
}

interface UsuarioFormProps {
  usuarioToEdit?: Usuario | null
  onSuccess?: () => void
  onCancel?: () => void
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

export default function UsuarioForm({ usuarioToEdit, onSuccess, onCancel }: UsuarioFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Rol[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [assignedSucursales, setAssignedSucursales] = useState<number[]>([])
  const [isSelectingSucursal, setIsSelectingSucursal] = useState(false)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [posicion, setPosicion] = useState('')

  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [assignedRoles, setAssignedRoles] = useState<number[]>([])
  const [isSelectingRol, setIsSelectingRol] = useState(false)

  const [passwordActual, setPasswordActual] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [lastSucursalId, setLastSucursalId] = useState<number | null>(null)

  const [idioma, setIdioma] = useState(defaultPreferences.idioma)
  const [zonaHoraria, setZonaHoraria] = useState(defaultPreferences.zona_horaria)
  const [notifInventario, setNotifInventario] = useState(defaultPreferences.notificaciones.alertas_inventario)
  const [notifSemanal, setNotifSemanal] = useState(defaultPreferences.notificaciones.resumen_semanal)
  const [notifChat, setNotifChat] = useState(defaultPreferences.notificaciones.chat_interno)
  const [notifPromociones, setNotifPromociones] = useState(defaultPreferences.notificaciones.nuevas_promociones)

  // Confirmation state
  const [showConfirm, setShowConfirm] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)

  // Track initial values for change detection
  const initialValuesRef = useRef<any>(null)

  useEffect(() => {
    // Determine if form is dirty by comparing current values with initial values
    if (!initialValuesRef.current) return

    const currentValues = {
      nombre, email, telefono, posicion, isSuperadmin, assignedRoles, twoFactor,
      idioma, zonaHoraria, notifInventario, notifSemanal, notifChat, notifPromociones
    }

    const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(initialValuesRef.current)
    setIsFormDirty(hasChanged)
  }, [
    nombre, email, telefono, posicion, isSuperadmin, assignedRoles, assignedSucursales, twoFactor,
    idioma, zonaHoraria, notifInventario, notifSemanal, notifChat, notifPromociones
  ])

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

  useEffect(() => {
    if (usuarioToEdit) {
      setNombre(usuarioToEdit.nombre || '')
      setEmail(usuarioToEdit.email || '')
      setTelefono(usuarioToEdit.telefono || '')
      setPosicion(usuarioToEdit.posicion || '')
      setIsSuperadmin(usuarioToEdit.is_superadmin || false)

      const userRoles = [usuarioToEdit.rol_id]
      if (usuarioToEdit.roles_adicionales) {
        usuarioToEdit.roles_adicionales.forEach(r => {
          if (!userRoles.includes(r.rol_id)) userRoles.push(r.rol_id)
        })
      }
      setAssignedRoles(userRoles)

      setTwoFactor(usuarioToEdit.two_factor_enabled || false)

      // Cargar sucursales asignadas
      if (usuarioToEdit.usuario_sucursales) {
        setAssignedSucursales(usuarioToEdit.usuario_sucursales.map((s: any) => s.sucursal_id))
      } else if (usuarioToEdit.sucursales_asignadas) {
        setAssignedSucursales(usuarioToEdit.sucursales_asignadas.map((s: any) => s.sucursal_id))
      }

      const prefs = usuarioToEdit.preferencias || defaultPreferences
      setIdioma(prefs.idioma || defaultPreferences.idioma)
      setZonaHoraria(prefs.zona_horaria || defaultPreferences.zona_horaria)

      const notifs = prefs.notificaciones || defaultPreferences.notificaciones
      setNotifInventario(notifs.alertas_inventario ?? true)
      setNotifSemanal(notifs.resumen_semanal ?? true)
      setNotifChat(notifs.chat_interno ?? false)
      setNotifPromociones(notifs.nuevas_promociones ?? true)

      // Set initial values for change detection
      initialValuesRef.current = {
        nombre: usuarioToEdit.nombre || '',
        email: usuarioToEdit.email || '',
        telefono: usuarioToEdit.telefono || '',
        posicion: usuarioToEdit.posicion || '',
        isSuperadmin: usuarioToEdit.is_superadmin || false,
        assignedRoles: userRoles,
        twoFactor: usuarioToEdit.two_factor_enabled || false,
        lastSucursalId: usuarioToEdit.last_sucursal_id || null,
        idioma: prefs.idioma || defaultPreferences.idioma,
        zonaHoraria: prefs.zona_horaria || defaultPreferences.zona_horaria,
        notifInventario: notifs.alertas_inventario ?? true,
        notifSemanal: notifs.resumen_semanal ?? true,
        notifChat: notifs.chat_interno ?? false,
        notifPromociones: notifs.nuevas_promociones ?? true
      }
    } else {
      // Set initial values for a new user
      initialValuesRef.current = {
        nombre: '',
        email: '',
        telefono: '',
        posicion: '',
        isSuperadmin: false,
        assignedRoles: [],
        twoFactor: false,
        lastSucursalId: null,
        idioma: defaultPreferences.idioma,
        zonaHoraria: defaultPreferences.zona_horaria,
        notifInventario: defaultPreferences.notificaciones.alertas_inventario,
        notifSemanal: defaultPreferences.notificaciones.resumen_semanal,
        notifChat: defaultPreferences.notificaciones.chat_interno,
        notifPromociones: defaultPreferences.notificaciones.nuevas_promociones
      }
    }
  }, [usuarioToEdit])

  const handleAddRol = (rolId: number) => {
    if (!assignedRoles.includes(rolId)) {
      setAssignedRoles([...assignedRoles, rolId])
    }
    setIsSelectingRol(false)
  }

  const handleRemoveRol = (rolId: number) => {
    setAssignedRoles(assignedRoles.filter(id => id !== rolId))
  }

  const handleAddSucursal = (sucursalId: number) => {
    if (!assignedSucursales.includes(sucursalId)) {
      setAssignedSucursales([...assignedSucursales, sucursalId])
    }
    setIsSelectingSucursal(false)
  }

  const handleRemoveSucursal = (sucursalId: number) => {
    setAssignedSucursales(assignedSucursales.filter(id => id !== sucursalId))
  }

  const handleCancelClick = () => {
    if (isFormDirty) {
      setShowConfirm(true)
    } else {
      executeCancel()
    }
  }

  const executeCancel = () => {
    if (onCancel) onCancel()
    else router.push('/usuarios')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (assignedRoles.length === 0 && !isSuperadmin) {
      toast.error('Debe asignar al menos un rol o seleccionar Super administrador')
      return
    }

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
        is_superadmin: isSuperadmin,
        two_factor_enabled: twoFactor,
        activo: true,
        rol_id: mainRolId,
        roles_adicionales: additionalRoles,
        last_sucursal_id: lastSucursalId,
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
      } else if (!usuarioToEdit) {
        toast.error('La contraseña es requerida para un nuevo usuario')
        setLoading(false)
        return
      }

      const method = usuarioToEdit ? 'PUT' : 'POST'
      const url = usuarioToEdit ? `/api/usuarios/${usuarioToEdit.id}` : '/api/usuarios'

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

      toast.success(usuarioToEdit ? 'Perfil actualizado exitosamente' : 'Usuario creado exitosamente')
      if (onSuccess) onSuccess()
      else router.push('/usuarios')
    } catch (error: any) {
      console.error('CRITICAL SUBMIT ERROR:', error)
      toast.error(error.message || 'Error desconocido al guardar')
    } finally {
      setLoading(false)
    }
  }

  const availableRolesToAdd = roles.filter(r => !assignedRoles.includes(r.id))

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-transparent">
      {/* Sticky Header with Title and Actions */}
      <div className="sticky top-0 sm:top-[-32px] z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-2 mb-4 -mt-8 -mx-8 px-8">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancelClick}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">west</span>
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                {usuarioToEdit ? 'Configuración de Perfil' : 'Nuevo Usuario'}
              </h1>
              <p className="text-slate-500 font-medium text-[10px] hidden sm:block uppercase tracking-wider">
                {usuarioToEdit
                  ? 'Gestiona tu información personal, seguridad y preferencias.'
                  : 'Crea una nueva cuenta de acceso para un miembro del equipo.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="profile-form"
              disabled={loading}
              className="px-6 h-10 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 text-sm font-bold"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="flex-1 overflow-visible max-w-[1000px] mx-auto px-4 space-y-6 pb-32">

        {/* 1. Información Personal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Información Personal</h3>
          <div className="flex flex-col md:flex-row gap-10">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-white dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
                  {usuarioToEdit?.avatar_url ? (
                    <img src={usuarioToEdit.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-slate-300">person</span>
                  )}
                </div>
                <button type="button" className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 rounded-full border-4 border-white dark:border-slate-700 flex items-center justify-center text-white hover:bg-blue-700 transition shadow-md">
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </button>
              </div>
              <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                Eliminar foto
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input
                  type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
                <input
                  type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="+34 600 000 000"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Posición / Rol Profesional</label>
                <input
                  type="text" value={posicion} onChange={e => setPosicion(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                  placeholder="Ej. Gerente de Ventas"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sucursales Asignadas */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Sucursales Asignadas</h3>

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

        {/* 2. Roles de Usuario */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Roles y Permisos</h3>
            <button type="button" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Configurar Permisos
            </button>
          </div>

          <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative flex items-center justify-center w-6 h-6">
                <input
                  type="checkbox"
                  className="peer w-6 h-6 border-2 border-orange-200 rounded-lg cursor-pointer appearance-none checked:bg-orange-600 checked:border-orange-600 transition-all"
                  checked={isSuperadmin}
                  onChange={e => setIsSuperadmin(e.target.checked)}
                />
                <span className="material-symbols-outlined absolute text-white text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
              </div>
              <div>
                <span className="text-sm font-bold text-orange-900">Acceso Super administrador</span>
                <p className="text-[11px] text-orange-700 font-medium">Otorga control total sobre todos los módulos y configuraciones del sistema.</p>
              </div>
            </label>
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

        {/* 3. Seguridad */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Seguridad y Credenciales</h3>
            {!usuarioToEdit && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Requerido</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contraseña Actual</label>
              <input
                type="password"
                value={passwordActual}
                onChange={e => setPasswordActual(e.target.value)}
                disabled={!usuarioToEdit}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Repetir Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Autenticación de Dos Factores (2FA)</p>
                <p className="text-xs font-medium text-slate-500">Mejora la seguridad de tu cuenta con un código de verificación adicional.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[22px] after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* 4. Preferencias */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-8">Personalización y Notificaciones</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Idioma del Sistema</label>
                <div className="relative group/select">
                  <select
                    value={idioma}
                    onChange={e => setIdioma(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none pr-12 cursor-pointer [&::-ms-expand]:hidden [background-image:none]"
                  >
                    <option>Español (ES)</option>
                    <option>English (US)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-blue-500 transition-colors">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Zona Horaria</label>
                <div className="relative group/select">
                  <select
                    value={zonaHoraria}
                    onChange={e => setZonaHoraria(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none pr-12 cursor-pointer [&::-ms-expand]:hidden [background-image:none]"
                  >
                    <option>(GMT +01:00) Madrid, España</option>
                    <option>(GMT -05:00) Bogotá, Colombia</option>
                    <option>(GMT -06:00) Ciudad de México</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-blue-500 transition-colors">expand_more</span>
                </div>
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
          </div>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeCancel}
        title="Cambios sin guardar"
        message="Hay cambios realizados en el formulario. ¿Estás seguro de que deseas salir sin guardar?"
        confirmText="Salir sin guardar"
        cancelText="Continuar editando"
        variant="danger"
      />
    </div>
  )
}
