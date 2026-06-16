'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOffice2Icon,
  PhoneIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Clinica, Sucursal, Usuario } from '@/types'

type TabConfig = 'clinica' | 'sucursales' | 'usuarios' | 'whatsapp' | 'notificaciones' | 'seguridad'

const tabsConfig: { id: TabConfig; label: string; icon: any }[] = [
  { id: 'clinica', label: 'Mi clínica', icon: BuildingOffice2Icon },
  { id: 'sucursales', label: 'Sucursales', icon: BuildingOffice2Icon },
  { id: 'usuarios', label: 'Usuarios', icon: UserGroupIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: PhoneIcon },
  { id: 'notificaciones', label: 'Notificaciones', icon: BellIcon },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheckIcon },
]

const ROLES_LABEL: Record<string, string> = {
  admin_general: 'Administrador',
  director_clinico: 'Director Clínico',
  recepcion: 'Recepción',
  terapeuta: 'Terapeuta',
}

export default function ConfiguracionPage() {
  const [tabActiva, setTabActiva] = useState<TabConfig>('clinica')
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [formClinica, setFormClinica] = useState<Partial<Clinica>>({})
  const [configWA, setConfigWA] = useState({ phone_number_id: '', access_token: '', activo: false })
  const [configNotif, setConfigNotif] = useState({
    recordatorio_24h: true,
    recordatorio_1h: false,
    confirmacion_cita: false,
    ausencia_seguimiento: false,
    cobro_pendiente: false,
    reporte_mensual: false,
  })
  const [modalUsuario, setModalUsuario] = useState(false)
  const [modoUsuario, setModoUsuario] = useState<'crear' | 'editar'>('crear')
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null)
  const [usuarioEditandoRol, setUsuarioEditandoRol] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [modalSucursal, setModalSucursal] = useState(false)
  const [formUsuario, setFormUsuario] = useState({ nombre: '', apellidos: '', email: '', rol: 'terapeuta', telefono: '' })
  const [formSucursal, setFormSucursal] = useState({ nombre: '', direccion: '', ciudad: '', estado: '', telefono: '' })
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as TabConfig | null
    if (tab && tabsConfig.some(t => t.id === tab)) {
      setTabActiva(tab)
    }
    if (params.get('nuevo') === '1' && tab === 'usuarios') {
      setModoUsuario('crear')
      setUsuarioEditandoId(null)
      setUsuarioEditandoRol(null)
      setFormUsuario({ nombre: '', apellidos: '', email: '', rol: 'terapeuta', telefono: '' })
      setModalUsuario(true)
    }
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setCurrentUserId(session.user.id)
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const [clinRes, sucRes, usrRes, waRes] = await Promise.all([
        supabase.from('clinicas').select('*').eq('id', usuario.clinica_id).single(),
        supabase.from('sucursales').select('*').eq('clinica_id', usuario.clinica_id).order('nombre'),
        supabase.from('usuarios').select('*').eq('clinica_id', usuario.clinica_id).order('nombre'),
        supabase.from('config_whatsapp').select('*').eq('clinica_id', usuario.clinica_id).maybeSingle(),
      ])

      if (clinRes.data) {
        setClinica(clinRes.data as Clinica)
        setFormClinica(clinRes.data as Clinica)
        const cfg = (clinRes.data as Clinica & { configuracion?: { notificaciones?: typeof configNotif } }).configuracion
        if (cfg?.notificaciones) {
          setConfigNotif(prev => ({ ...prev, ...cfg.notificaciones }))
        }
      }
      setSucursales((sucRes.data || []) as Sucursal[])
      setUsuarios((usrRes.data || []) as Usuario[])
      if (waRes.data) setConfigWA({
        phone_number_id: waRes.data.phone_number_id || '',
        access_token: waRes.data.access_token || '',
        activo: waRes.data.activo || false,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const guardarClinica = async () => {
    if (!clinica) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('clinicas').update({
        nombre: formClinica.nombre,
        rfc: formClinica.rfc,
        telefono: formClinica.telefono,
        email: formClinica.email,
        sitio_web: formClinica.sitio_web,
        direccion: formClinica.direccion,
        ciudad: formClinica.ciudad,
        estado: formClinica.estado,
        color_primario: formClinica.color_primario,
      }).eq('id', clinica.id)
      if (error) throw error
      toast.success('Configuración guardada')
      fetchData()
    } catch { toast.error('Error al guardar') } finally { setGuardando(false) }
  }

  const guardarWhatsApp = async () => {
    if (!clinica) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('config_whatsapp').upsert({
        clinica_id: clinica.id,
        phone_number_id: configWA.phone_number_id,
        access_token: configWA.access_token,
        activo: configWA.activo,
      })
      if (error) throw error
      toast.success('Configuración de WhatsApp guardada')
    } catch { toast.error('Error al guardar WhatsApp') } finally { setGuardando(false) }
  }

  const guardarNotificaciones = async () => {
    if (!clinica) return
    setGuardando(true)
    try {
      const actual = (clinica as Clinica & { configuracion?: Record<string, unknown> }).configuracion || {}
      const { error } = await supabase.from('clinicas').update({
        configuracion: { ...actual, notificaciones: configNotif },
      }).eq('id', clinica.id)
      if (error) throw error
      toast.success('Preferencias de notificaciones guardadas')
      fetchData()
    } catch { toast.error('Error al guardar') } finally { setGuardando(false) }
  }

  const abrirAgregarUsuario = () => {
    setModoUsuario('crear')
    setUsuarioEditandoId(null)
    setUsuarioEditandoRol(null)
    setFormUsuario({ nombre: '', apellidos: '', email: '', rol: 'terapeuta', telefono: '' })
    setModalUsuario(true)
  }

  const abrirEditarUsuario = (usr: Usuario) => {
    setModoUsuario('editar')
    setUsuarioEditandoId(usr.id)
    setUsuarioEditandoRol(usr.rol)
    setFormUsuario({
      nombre: usr.nombre,
      apellidos: usr.apellidos || '',
      email: usr.email,
      rol: usr.rol === 'padre' ? 'terapeuta' : usr.rol,
      telefono: usr.telefono || '',
    })
    setModalUsuario(true)
  }

  const guardarUsuario = async () => {
    if (modoUsuario === 'crear') {
      await invitarUsuario()
      return
    }
    if (!usuarioEditandoId || !formUsuario.nombre) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      const body: Record<string, unknown> = {
        nombre: formUsuario.nombre,
        apellidos: formUsuario.apellidos,
        telefono: formUsuario.telefono,
      }
      if (usuarioEditandoRol !== 'padre') {
        body.rol = formUsuario.rol
      }
      const res = await fetch(`/api/staff/usuarios/${usuarioEditandoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar usuario')
      toast.success('Usuario actualizado')
      setModalUsuario(false)
      setUsuarioEditandoId(null)
      setUsuarioEditandoRol(null)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar usuario')
    } finally {
      setGuardando(false)
    }
  }

  const quitarAccesoUsuario = async (usr: Usuario) => {
    if (usr.id === currentUserId) {
      toast.error('No puedes quitar tu propio acceso')
      return
    }
    if (!confirm(`¿Quitar el acceso de ${usr.nombre} ${usr.apellidos || ''}? Ya no podrá iniciar sesión.`)) {
      return
    }
    setGuardando(true)
    try {
      const res = await fetch(`/api/staff/usuarios/${usr.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al quitar acceso')
      toast.success('Acceso eliminado')
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar acceso')
    } finally {
      setGuardando(false)
    }
  }

  const invitarUsuario = async () => {
    if (!clinica || !formUsuario.email || !formUsuario.nombre) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/staff/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUsuario),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al agregar usuario')
      toast.success(`Usuario creado. Email: ${data.email} · Contraseña: ${data.password}`, { duration: 8000 })
      setModalUsuario(false)
      setFormUsuario({ nombre: '', apellidos: '', email: '', rol: 'terapeuta', telefono: '' })
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar usuario')
    } finally {
      setGuardando(false)
    }
  }

  const crearSucursal = async () => {
    if (!clinica || !formSucursal.nombre) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      const { error } = await supabase.from('sucursales').insert({
        clinica_id: clinica.id,
        nombre: formSucursal.nombre,
        direccion: formSucursal.direccion,
        ciudad: formSucursal.ciudad,
        estado: formSucursal.estado,
        telefono: formSucursal.telefono,
        activa: true,
      })
      if (error) throw error
      toast.success('Sucursal creada')
      setModalSucursal(false)
      setFormSucursal({ nombre: '', direccion: '', ciudad: '', estado: '', telefono: '' })
      fetchData()
    } catch { toast.error('Error al crear sucursal') }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="skeleton h-10 w-80" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Administra tu clínica y ajustes del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar de tabs */}
        <div className="card p-3 h-fit">
          <nav className="space-y-0.5">
            {tabsConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                  tabActiva === tab.id ? 'sidebar-item-active' : 'sidebar-item'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="lg:col-span-3 space-y-4">
          {/* TAB: CLÍNICA */}
          {tabActiva === 'clinica' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                Información de la clínica
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nombre de la clínica *</label>
                  <input className="input" value={formClinica.nombre || ''} onChange={e => setFormClinica(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="label">RFC</label>
                  <input className="input" placeholder="ABC123456XYZ" value={formClinica.rfc || ''} onChange={e => setFormClinica(f => ({ ...f, rfc: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" placeholder="+52 33 1234 5678" value={formClinica.telefono || ''} onChange={e => setFormClinica(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={formClinica.email || ''} onChange={e => setFormClinica(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Sitio web</label>
                  <input className="input" placeholder="https://miclinica.com" value={formClinica.sitio_web || ''} onChange={e => setFormClinica(f => ({ ...f, sitio_web: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Dirección</label>
                  <input className="input" value={formClinica.direccion || ''} onChange={e => setFormClinica(f => ({ ...f, direccion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ciudad</label>
                  <input className="input" value={formClinica.ciudad || ''} onChange={e => setFormClinica(f => ({ ...f, ciudad: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <input className="input" value={formClinica.estado || ''} onChange={e => setFormClinica(f => ({ ...f, estado: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Color primario de marca</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer" value={formClinica.color_primario || '#6366F1'} onChange={e => setFormClinica(f => ({ ...f, color_primario: e.target.value }))} />
                    <input className="input" value={formClinica.color_primario || '#6366F1'} onChange={e => setFormClinica(f => ({ ...f, color_primario: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-neutral-100">
                <button onClick={guardarClinica} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB: SUCURSALES */}
          {tabActiva === 'sucursales' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-500">{sucursales.length} sucursales</p>
                <button onClick={() => setModalSucursal(true)} className="btn-primary btn-sm">
                  <PlusIcon className="w-4 h-4" /> Nueva sucursal
                </button>
              </div>
              {sucursales.map(suc => (
                <div key={suc.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-neutral-900">{suc.nombre}</h3>
                        <span className={`badge ${suc.activa ? 'badge-success' : 'badge-neutral'}`}>
                          {suc.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      {suc.direccion && <p className="text-xs text-neutral-500">{suc.direccion}</p>}
                      {(suc.ciudad || suc.estado) && (
                        <p className="text-xs text-neutral-500">{[suc.ciudad, suc.estado].filter(Boolean).join(', ')}</p>
                      )}
                      {suc.telefono && (
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                          <PhoneIcon className="w-3 h-3" />{suc.telefono}
                        </p>
                      )}
                    </div>
                    <button className="btn-ghost btn-sm text-neutral-400">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {sucursales.length === 0 && (
                <div className="card empty-state py-12">
                  <BuildingOffice2Icon className="empty-state-icon w-12 h-12" />
                  <p className="empty-state-title">Sin sucursales</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: USUARIOS */}
          {tabActiva === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-500">{usuarios.length} usuarios</p>
                <button onClick={abrirAgregarUsuario} className="btn-primary btn-sm">
                  <PlusIcon className="w-4 h-4" /> Agregar usuario
                </button>
              </div>
              <div className="card overflow-hidden">
                <div className="divide-y divide-neutral-100">
                  {usuarios.map(usr => (
                    <div key={usr.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="avatar avatar-sm shrink-0">{usr.nombre[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {usr.nombre} {usr.apellidos}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{usr.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="badge badge-primary text-2xs">
                          {ROLES_LABEL[usr.rol] || usr.rol}
                        </span>
                        <span className={`badge text-2xs ${usr.activo ? 'badge-success' : 'badge-neutral'}`}>
                          {usr.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirEditarUsuario(usr)}
                          className="btn-ghost btn-sm text-neutral-400 hover:text-primary-600"
                          title="Editar usuario"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        {usr.activo && usr.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => quitarAccesoUsuario(usr)}
                            className="btn-ghost btn-sm text-neutral-400 hover:text-danger-600"
                            title="Quitar acceso"
                            disabled={guardando}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: WHATSAPP */}
          {tabActiva === 'whatsapp' && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h2 className="text-sm font-semibold text-neutral-900">WhatsApp Business API</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${configWA.activo ? 'bg-success-500' : 'bg-neutral-300'}`} />
                  <span className="text-xs text-neutral-500">{configWA.activo ? 'Conectado' : 'Desconectado'}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">⚙️ Configuración requerida</p>
                <p className="text-xs">Para usar WhatsApp Business, necesitas una cuenta verificada de Meta Business y un número de teléfono dedicado. <a href="https://developers.facebook.com/docs/whatsapp/api" target="_blank" rel="noreferrer" className="underline">Ver documentación</a></p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Phone Number ID</label>
                  <input className="input font-mono" placeholder="123456789012345" value={configWA.phone_number_id} onChange={e => setConfigWA(c => ({ ...c, phone_number_id: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Access Token</label>
                  <input type="password" className="input font-mono" placeholder="EAAxxxxxxx..." value={configWA.access_token} onChange={e => setConfigWA(c => ({ ...c, access_token: e.target.value }))} />
                </div>
                <div>
                  <label className="label">URL del webhook</label>
                  <input
                    className="input font-mono text-xs"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.aprendamosjuntos.mx'}/api/whatsapp/webhook`}
                  />
                  <p className="text-2xs text-neutral-400 mt-1">Configura esta URL en Meta Business → WhatsApp → Webhooks</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                  <input type="checkbox" id="wa_activo" checked={configWA.activo} onChange={e => setConfigWA(c => ({ ...c, activo: e.target.checked }))} className="w-4 h-4 text-primary-600 rounded" />
                  <label htmlFor="wa_activo" className="text-sm text-neutral-700 cursor-pointer">
                    Activar integración de WhatsApp
                  </label>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-neutral-100">
                <button onClick={guardarWhatsApp} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICACIONES */}
          {tabActiva === 'notificaciones' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                Notificaciones automáticas
              </h2>
              <div className="space-y-4">
                {[
                  { id: 'recordatorio_24h', label: 'Recordatorio de cita 24 horas antes', desc: 'Envía un WhatsApp a los padres un día antes de la cita' },
                  { id: 'recordatorio_1h', label: 'Recordatorio de cita 1 hora antes', desc: 'Envía un recordatorio una hora antes de la cita' },
                  { id: 'confirmacion_cita', label: 'Solicitar confirmación de cita', desc: 'Pide a los padres que confirmen o cancelen 48h antes' },
                  { id: 'ausencia_seguimiento', label: 'Seguimiento por ausencia', desc: 'Notifica al terapeuta cuando un paciente no asiste 2 sesiones seguidas' },
                  { id: 'cobro_pendiente', label: 'Aviso de pago pendiente', desc: 'Envía recordatorio de cobros vencidos' },
                  { id: 'reporte_mensual', label: 'Reporte mensual automático', desc: 'Genera y envía reporte de progreso al inicio de cada mes' },
                ].map(notif => (
                  <div key={notif.id} className="flex items-center justify-between gap-4 p-3 bg-neutral-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{notif.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{notif.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={configNotif[notif.id as keyof typeof configNotif] ?? false}
                        onChange={e => setConfigNotif(c => ({ ...c, [notif.id]: e.target.checked }))}
                      />
                      <div className="w-10 h-6 bg-neutral-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t border-neutral-100">
                <button onClick={guardarNotificaciones} disabled={guardando} className="btn-primary">
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: SEGURIDAD */}
          {tabActiva === 'seguridad' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                Seguridad y acceso
              </h2>
              <div className="space-y-4">
                <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-success-800">Seguridad activa</p>
                    <p className="text-xs text-success-700 mt-0.5">
                      Autenticación Supabase, RLS por clínica, TLS en tránsito y acceso por roles (admin, terapeuta, recepción, padre).
                    </p>
                  </div>
                </div>
                {[
                  { label: 'Row Level Security (RLS)', desc: 'Cada clínica solo ve sus datos. Padres solo ven a su hijo.' },
                  { label: 'Roles de usuario', desc: 'Admin, director, terapeuta, recepción y padre con permisos diferenciados.' },
                  { label: 'API protegidas', desc: 'Cron, IA, archivos y staff requieren autenticación o secretos.' },
                  { label: 'Webhook WhatsApp', desc: 'Verificación de firma HMAC cuando WHATSAPP_APP_SECRET está configurado.' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-neutral-50 rounded-xl">
                    <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Agregar / editar usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalUsuario(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="text-base font-semibold text-neutral-900">
                {modoUsuario === 'crear' ? 'Agregar usuario' : 'Editar usuario'}
              </h2>
              <button onClick={() => setModalUsuario(false)} className="btn-icon text-neutral-400"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" value={formUsuario.nombre} onChange={e => setFormUsuario(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Apellidos</label>
                  <input className="input" value={formUsuario.apellidos} onChange={e => setFormUsuario(f => ({ ...f, apellidos: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={formUsuario.email}
                  onChange={e => setFormUsuario(f => ({ ...f, email: e.target.value }))}
                  disabled={modoUsuario === 'editar'}
                />
              </div>
              <div>
                <label className="label">Rol</label>
                {modoUsuario === 'editar' && usuarioEditandoRol === 'padre' ? (
                  <input className="input bg-neutral-50" value="Padre / Tutor" disabled />
                ) : (
                  <select className="input" value={formUsuario.rol} onChange={e => setFormUsuario(f => ({ ...f, rol: e.target.value }))}>
                    {Object.entries(ROLES_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={formUsuario.telefono} onChange={e => setFormUsuario(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-100">
              <button onClick={() => setModalUsuario(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardarUsuario} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : modoUsuario === 'crear' ? 'Agregar usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva sucursal */}
      {modalSucursal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalSucursal(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="text-base font-semibold text-neutral-900">Nueva sucursal</h2>
              <button onClick={() => setModalSucursal(false)} className="btn-icon text-neutral-400"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" placeholder="Ej: Sucursal Centro" value={formSucursal.nombre} onChange={e => setFormSucursal(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={formSucursal.direccion} onChange={e => setFormSucursal(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ciudad</label>
                  <input className="input" value={formSucursal.ciudad} onChange={e => setFormSucursal(f => ({ ...f, ciudad: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <input className="input" value={formSucursal.estado} onChange={e => setFormSucursal(f => ({ ...f, estado: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={formSucursal.telefono} onChange={e => setFormSucursal(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-100">
              <button onClick={() => setModalSucursal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={crearSucursal} className="btn-primary flex-1">Crear sucursal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
