'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PaperAirplaneIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Paciente, Familiar, MensajeWhatsapp, ChatMensaje } from '@/types'

type PestañaActiva = 'whatsapp' | 'chat'

const PLANTILLAS_WA = [
  {
    id: 'recordatorio_cita',
    nombre: 'Recordatorio de cita',
    mensaje: '👋 Hola {nombre}! Les recordamos la cita de {paciente} el {fecha} a las {hora}. ¿Confirmas asistencia? Responde SÍ o NO.',
  },
  {
    id: 'tareas_casa',
    nombre: 'Tareas para casa',
    mensaje: '📚 Hola {nombre}! Aquí las actividades de esta semana para {paciente}:\n\n{tareas}\n\n¿Tienes alguna duda? Con gusto te ayudamos.',
  },
  {
    id: 'reporte_progreso',
    nombre: 'Reporte de progreso',
    mensaje: '✨ Hola {nombre}! Queremos compartir el reporte de progreso de {paciente}. Adjuntamos el documento. Para más información, puedes escribirnos aquí.',
  },
  {
    id: 'ausencia',
    nombre: 'Seguimiento por ausencia',
    mensaje: '💙 Hola {nombre}, notamos que {paciente} no pudo asistir a su cita. ¿Todo está bien? Podemos reagendar cuando lo necesiten.',
  },
  {
    id: 'encuesta',
    nombre: 'Encuesta de satisfacción',
    mensaje: '🌟 Hola {nombre}! Nos importa tu opinión sobre el servicio de {paciente}. Del 1 al 10, ¿qué tan satisfecho estás con la terapia? Tu respuesta nos ayuda a mejorar.',
  },
]

function formatFechaChat(fecha: string) {
  const d = new Date(fecha)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ayer'
  return format(d, 'd MMM', { locale: es })
}

export default function MensajesPage() {
  const [pestañaActiva, setPestañaActiva] = useState<PestañaActiva>('whatsapp')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [familiares, setFamiliares] = useState<Familiar[]>([])
  const [mensajesWA, setMensajesWA] = useState<MensajeWhatsapp[]>([])
  const [chatMensajes, setChatMensajes] = useState<ChatMensaje[]>([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string>('')
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [modalEnvioOpen, setModalEnvioOpen] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clinicaId, setClinicaId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMensajes])
  useEffect(() => {
    if (pacienteSeleccionado) fetchMensajesPaciente()
  }, [pacienteSeleccionado, pestañaActiva])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUsuarioId(session.user.id)
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return
      setClinicaId(usuario.clinica_id)

      const pacsRes = await supabase
        .from('pacientes')
        .select(`id, nombre, apellidos, familiares(id, nombre, telefono, email, tiene_acceso_portal)`)
        .eq('clinica_id', usuario.clinica_id)
        .eq('activo', true)
        .order('nombre')

      setPacientes((pacsRes.data || []) as unknown as Paciente[])

      // Últimos mensajes WA
      const waRes = await supabase
        .from('mensajes_whatsapp')
        .select(`*, paciente:pacientes(nombre, apellidos)`)
        .eq('clinica_id', usuario.clinica_id)
        .order('created_at', { ascending: false })
        .limit(50)

      setMensajesWA((waRes.data || []) as unknown as MensajeWhatsapp[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMensajesPaciente = async () => {
    if (!pacienteSeleccionado) return
    if (pestañaActiva === 'chat') {
      const { data } = await supabase
        .from('chat_mensajes')
        .select('*')
        .eq('paciente_id', pacienteSeleccionado)
        .order('created_at')
        .limit(100)
      setChatMensajes((data || []) as ChatMensaje[])
    }
  }

  const aplicarPlantilla = (plantillaId: string) => {
    const plt = PLANTILLAS_WA.find(p => p.id === plantillaId)
    if (plt) {
      const paciente = pacientes.find(p => p.id === pacienteSeleccionado)
      const fam = (paciente as any)?.familiares?.[0]
      let msg = plt.mensaje
        .replace('{nombre}', fam?.nombre || 'Familia')
        .replace('{paciente}', paciente ? `${paciente.nombre}` : 'el paciente')
        .replace('{fecha}', format(new Date(), "EEEE d 'de' MMMM", { locale: es }))
        .replace('{hora}', '10:00')
        .replace('{tareas}', '• Actividad 1\n• Actividad 2\n• Actividad 3')
      setMensaje(msg)
    }
    setPlantillaSeleccionada(plantillaId)
  }

  const enviarMensajeWA = async () => {
    if (!pacienteSeleccionado || !mensaje.trim()) {
      toast.error('Selecciona un paciente y escribe un mensaje')
      return
    }
    const paciente = pacientes.find(p => p.id === pacienteSeleccionado)
    const fam = (paciente as any)?.familiares?.find((f: any) => f.telefono)
    if (!fam?.telefono) {
      toast.error('El familiar no tiene teléfono registrado')
      return
    }

    setEnviando(true)
    try {
      const { error } = await supabase.from('mensajes_whatsapp').insert({
        clinica_id: clinicaId,
        paciente_id: pacienteSeleccionado,
        familiar_id: fam.id,
        enviado_por: usuarioId,
        telefono_destino: fam.telefono,
        tipo_mensaje: plantillaSeleccionada || 'libre',
        plantilla: plantillaSeleccionada || null,
        contenido: mensaje,
        estado: 'enviado',
      })
      if (error) throw error
      toast.success('Mensaje registrado para envío')
      setMensaje('')
      setPlantillaSeleccionada('')
      setModalEnvioOpen(false)
      fetchData()
    } catch (err) {
      toast.error('Error al enviar el mensaje')
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  const enviarMensajeChat = async () => {
    if (!pacienteSeleccionado || !mensaje.trim()) return
    try {
      const { error } = await supabase.from('chat_mensajes').insert({
        clinica_id: clinicaId,
        paciente_id: pacienteSeleccionado,
        remitente_id: usuarioId,
        tipo_remitente: 'terapeuta',
        contenido: mensaje,
        leido: false,
      })
      if (error) throw error
      setMensaje('')
      fetchMensajesPaciente()
    } catch (err) {
      console.error(err)
    }
  }

  const pacientesFiltrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellidos}`.toLowerCase().includes(busquedaPaciente.toLowerCase())
  )

  const estadoWAColor: Record<string, string> = {
    enviado: 'text-neutral-400', entregado: 'text-primary-400', leido: 'text-primary-600', fallido: 'text-danger-500',
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensajes</h1>
          <p className="page-subtitle">WhatsApp Business y chat con padres</p>
        </div>
        <button onClick={() => setModalEnvioOpen(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nuevo mensaje
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Lista de pacientes */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-neutral-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="search" placeholder="Buscar paciente..." className="input pl-9 py-2 text-sm"
                value={busquedaPaciente} onChange={e => setBusquedaPaciente(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {pacientesFiltrados.map(p => {
              const ultimoMsg = mensajesWA.find(m => m.paciente_id === p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => setPacienteSeleccionado(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors ${pacienteSeleccionado === p.id ? 'bg-primary-50' : ''}`}
                >
                  <div className="avatar avatar-sm shrink-0">{p.nombre[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{p.nombre} {p.apellidos}</p>
                    {ultimoMsg && (
                      <p className="text-xs text-neutral-400 truncate">{ultimoMsg.contenido.substring(0, 40)}...</p>
                    )}
                  </div>
                  {ultimoMsg && (
                    <p className="text-2xs text-neutral-400 shrink-0">
                      {formatFechaChat(ultimoMsg.created_at)}
                    </p>
                  )}
                </button>
              )
            })}
            {pacientesFiltrados.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-8">Sin resultados</p>
            )}
          </div>
        </div>

        {/* Panel de mensajes */}
        <div className="card overflow-hidden flex flex-col lg:col-span-3">
          {/* Tabs */}
          <div className="flex border-b border-neutral-100 shrink-0">
            {[
              { id: 'whatsapp' as PestañaActiva, label: '💬 WhatsApp', icon: PhoneIcon },
              { id: 'chat' as PestañaActiva, label: '🗨️ Portal Padres', icon: ChatBubbleLeftRightIcon },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setPestañaActiva(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  pestañaActiva === t.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!pacienteSeleccionado ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500">Selecciona un paciente para ver los mensajes</p>
              </div>
            </div>
          ) : (
            <>
              {/* WhatsApp: historial */}
              {pestañaActiva === 'whatsapp' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {mensajesWA.filter(m => m.paciente_id === pacienteSeleccionado).length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-neutral-400">Sin mensajes enviados a este paciente</p>
                        <button onClick={() => setModalEnvioOpen(true)} className="btn-primary btn-sm mt-3">
                          <PlusIcon className="w-4 h-4" /> Enviar primer mensaje
                        </button>
                      </div>
                    ) : (
                      mensajesWA.filter(m => m.paciente_id === pacienteSeleccionado).slice().reverse().map(msg => (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-xs lg:max-w-md">
                            <div className="bg-primary-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                              <p className="text-sm whitespace-pre-wrap">{msg.contenido}</p>
                            </div>
                            <div className="flex items-center gap-1.5 justify-end mt-1">
                              <p className="text-xs text-neutral-400">
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                              <CheckCircleIcon className={`w-3.5 h-3.5 ${estadoWAColor[msg.estado]}`} />
                              <span className="text-2xs text-neutral-400 capitalize">{msg.estado}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Enviar WA */}
                  <div className="p-4 border-t border-neutral-100 shrink-0">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          className="input resize-none pr-10"
                          rows={2}
                          placeholder="Escribe un mensaje de WhatsApp..."
                          value={mensaje}
                          onChange={e => setMensaje(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              enviarMensajeWA()
                            }
                          }}
                        />
                      </div>
                      <button onClick={enviarMensajeWA} disabled={enviando || !mensaje.trim()} className="btn-primary self-end">
                        {enviando ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {PLANTILLAS_WA.slice(0, 3).map(plt => (
                        <button
                          key={plt.id}
                          onClick={() => aplicarPlantilla(plt.id)}
                          className="text-xs px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        >
                          {plt.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Chat portal padres */}
              {pestañaActiva === 'chat' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMensajes.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-neutral-400">Sin mensajes en el chat del portal</p>
                      </div>
                    ) : (
                      chatMensajes.map(msg => {
                        const esTerapeuta = msg.tipo_remitente === 'terapeuta'
                        return (
                          <div key={msg.id} className={`flex ${esTerapeuta ? 'justify-end' : 'justify-start'}`}>
                            {!esTerapeuta && (
                              <div className="avatar avatar-sm mr-2 shrink-0 mt-1">P</div>
                            )}
                            <div className={`max-w-xs lg:max-w-md ${esTerapeuta ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div className={`rounded-2xl px-4 py-2.5 ${
                                esTerapeuta
                                  ? 'bg-primary-600 text-white rounded-tr-sm'
                                  : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.contenido}</p>
                              </div>
                              <p className="text-2xs text-neutral-400 mt-1 px-1">
                                {format(new Date(msg.created_at), 'HH:mm')}
                                {msg.leido && esTerapeuta && ' · Leído'}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Enviar chat */}
                  <div className="p-4 border-t border-neutral-100 shrink-0">
                    <div className="flex gap-2">
                      <textarea
                        className="input resize-none flex-1"
                        rows={2}
                        placeholder="Mensaje para los padres..."
                        value={mensaje}
                        onChange={e => setMensaje(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            enviarMensajeChat()
                          }
                        }}
                      />
                      <button onClick={enviarMensajeChat} disabled={!mensaje.trim()} className="btn-primary self-end">
                        <PaperAirplaneIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal envío WA */}
      {modalEnvioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalEnvioOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="text-base font-semibold text-neutral-900">Nuevo mensaje WhatsApp</h2>
              <button onClick={() => setModalEnvioOpen(false)} className="btn-icon text-neutral-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Destinatario (paciente)</label>
                <select className="input" value={pacienteSeleccionado} onChange={e => setPacienteSeleccionado(e.target.value)}>
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plantilla (opcional)</label>
                <select className="input" value={plantillaSeleccionada} onChange={e => e.target.value && aplicarPlantilla(e.target.value)}>
                  <option value="">Mensaje libre...</option>
                  {PLANTILLAS_WA.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mensaje</label>
                <textarea className="input resize-none" rows={5} placeholder="Escribe tu mensaje..." value={mensaje} onChange={e => setMensaje(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-100">
              <button onClick={() => setModalEnvioOpen(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={enviarMensajeWA} disabled={enviando || !pacienteSeleccionado || !mensaje.trim()} className="btn-primary flex-1">
                {enviando ? 'Enviando...' : 'Enviar mensaje'}
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
