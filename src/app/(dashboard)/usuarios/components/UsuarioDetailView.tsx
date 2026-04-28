'use client'

import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

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
}

interface UsuarioDetailViewProps {
  usuario: Usuario
  onEdit: () => void
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

export default function UsuarioDetailView({ usuario, onEdit }: UsuarioDetailViewProps) {
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toISOString().replace('T', ' ').substring(0, 16)
  }

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1) * 16777215).toString(16);
    return '#' + '000000'.substring(0, 6 - color.length) + color;
  }

  const prefs = usuario.preferencias || defaultPreferences
  const notifs = prefs.notificaciones || defaultPreferences.notificaciones

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
              {usuario.avatar_url ? (
                <img src={usuario.avatar_url} alt={usuario.nombre} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: stringToColor(usuario.nombre) }}
                >
                  {usuario.nombre.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-1">
                {usuario.nombre}
              </h2>
              <p className="text-slate-400 text-sm font-medium tracking-tight">
                Usuario ID: #{String(usuario.id).padStart(3, '0')} · {usuario.email}
              </p>
            </div>
            <Badge variant={usuario.activo ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px] px-3">
              {usuario.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">
            Última conexión: {formatDate(usuario.updated_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 hover:scale-[1.02] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Editar Usuario
          </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="space-y-12">
        <div className="grid grid-cols-2 gap-10">
          {/* Left Column */}
          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">INFORMACIÓN PERSONAL</p>

            <div className="space-y-3">
              <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950">
                <span className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-400">NOMBRE COMPLETO</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{usuario.nombre}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Nombre completo del usuario</p>
              </div>

              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">CORREO ELECTRÓNICO</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{usuario.email}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Dirección de email principal</p>
              </div>

              {usuario.telefono && (
                <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">TELÉFONO</span>
                  <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{usuario.telefono}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Número de contacto</p>
                </div>
              )}

              {usuario.posicion && (
                <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">POSICIÓN</span>
                  <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{usuario.posicion}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Rol profesional o cargo</p>
                </div>
              )}
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">SUCURSALES ASIGNADAS</p>

            <div className="space-y-3">
              {usuario.usuario_sucursales && usuario.usuario_sucursales.length > 0 ? (
                usuario.usuario_sucursales.map((us) => (
                  <div key={us.sucursal_id} className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">SUCURSAL</span>
                    <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{us.sucursal?.descripcion}</h4>
                  </div>
                ))
              ) : (
                <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-base font-black text-slate-400 mb-1">Sin sucursales asignadas</h4>
                  <p className="text-[11px] text-slate-500 font-medium">No hay sucursales configuradas para este usuario</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">ROLES Y PERMISOS</p>

            <div className="space-y-3">
              {usuario.is_superadmin && (
                <div className="p-6 rounded-3xl border border-orange-200 dark:border-orange-800 bg-orange-50/20 dark:bg-orange-950">
                  <span className="text-[10px] font-black uppercase tracking-widest block mb-4 text-orange-600">SUPER ADMINISTRADOR</span>
                  <h4 className="text-base font-black text-orange-900 dark:text-orange-100 mb-1">Acceso Total</h4>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300 font-medium">Control completo sobre todos los módulos</p>
                </div>
              )}

              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">ROL PRINCIPAL</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{usuario.rol?.nombre || 'Sin rol'}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Rol de acceso principal</p>
              </div>

              {usuario.roles_adicionales && usuario.roles_adicionales.length > 0 && (
                <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">ROLES ADICIONALES</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {usuario.roles_adicionales.map((ra) => (
                      <Badge key={ra.rol_id} variant="info" className="font-black text-xs">
                        {ra.rol.nombre}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-2">Roles adicionales asignados</p>
                </div>
              )}
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">SEGURIDAD</p>

            <div className="space-y-3">
              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">AUTENTICACIÓN</span>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    usuario.two_factor_enabled ? "bg-green-500" : "bg-slate-400"
                  )} />
                  <h4 className="text-base font-black text-slate-800 dark:text-white">
                    {usuario.two_factor_enabled ? '2FA Habilitado' : '2FA Deshabilitado'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Estado de autenticación de dos factores</p>
              </div>

              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">ÚLTIMA CONEXIÓN</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{formatDate(usuario.updated_at)}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Última actividad registrada</p>
              </div>
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">PREFERENCIAS</p>

            <div className="space-y-3">
              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">IDIOMA</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{prefs.idioma || 'No configurado'}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Idioma del sistema</p>
              </div>

              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">ZONA HORARIA</span>
                <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">{prefs.zona_horaria || 'No configurada'}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Configuración de zona horaria</p>
              </div>

              <div className="p-6 bg-slate-50/20 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">NOTIFICACIONES</span>
                <div className="space-y-1 mt-2">
                  {[
                    { key: 'alertas_inventario', label: 'Alertas de inventario' },
                    { key: 'resumen_semanal', label: 'Resumen semanal' },
                    { key: 'chat_interno', label: 'Chat interno' },
                    { key: 'nuevas_promociones', label: 'Nuevas promociones' }
                  ].map((notif) => (
                    <div key={notif.key} className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        notifs[notif.key] ? "bg-green-500" : "bg-slate-400"
                      )} />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{notif.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-2">Configuración de notificaciones</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}