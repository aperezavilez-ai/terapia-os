'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  PlusIcon,
  MicrophoneIcon,
  StopIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XMarkIcon,
  HomeIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Sesion, Paciente, PlanTerapeutico } from '@/types'

const ESTADO_ANIMO_OPTS = [
  { value: 'excelente', label: 'Excelente', emoji: '😊' },
  { value: 'bueno', label: 'Bueno', emoji: '🙂' },
  { value: 'regular', label: 'Regular', emoji: '😐' },
  { value: 'difícil', label: 'Difícil', emoji: '😟' },
  { value: 'muy_difícil', label: 'Muy difícil', emoji: '😢' },
]

const COOPERACION_OPTS = [1, 2, 3, 4, 5]

function ModalSesion({
  open,
  onClose,
  pacientes,
  planes,
  onSave,
}: {
  open: boolean
  onClose: () => void
  pacientes: Paciente[]
  planes: PlanTerapeutico[]
  onSave: () => void
}) {
  const [form, setForm] = useState({
    paciente_id: '',
    plan_id: '',
    fecha: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duracion_minutos: 60,
    actividades: '',
    avances: '',
    dificultades: '',
    estado_animo: '',
    nivel_cooperacion: 0,
    tareas_casa: '',
    proxima_sesion: '',
    observaciones: '',
  })
  const [grabando, setGrabando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()

  // Planes filtrados por paciente
  const planesFiltrados = planes.filter(p => p.paciente_id === form.paciente_id)

  const iniciarGrabacion = (campo: string) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tu navegador no soporta dictado por voz')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-MX'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const texto = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
      setForm(f => ({ ...f, [campo]: f[campo as keyof typeof f] + ' ' + texto }))
    }
    recognition.onerror = () => {
      setGrabando(null)
      toast.error('Error en el dictado')
    }
    recognition.onend = () => setGrabando(null)
    recognition.start()
    recognitionRef.current = recognition
    setGrabando(campo)
    toast.success('Dictado iniciado — habla ahora')
  }

  const detenerGrabacion = () => {
    recognitionRef.current?.stop()
    setGrabando(null)
  }

  const handleGuardar = async () => {
    if (!form.paciente_id || !form.actividades.trim()) {
      toast.error('Completa el paciente y las actividades')
      return
    }
    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const { error } = await supabase.from('sesiones').insert({
        paciente_id: form.paciente_id,
        terapeuta_id: session.user.id,
        plan_id: form.plan_id || null,
        clinica_id: usuario.clinica_id,
        fecha: new Date(form.fecha).toISOString(),
        duracion_minutos: form.duracion_minutos,
        actividades: form.actividades,
        avances: form.avances,
        dificultades: form.dificultades,
        estado_animo: form.estado_animo,
        nivel_cooperacion: form.nivel_cooperacion || null,
        tareas_casa: form.tareas_casa,
        proxima_sesion: form.proxima_sesion,
        observaciones: form.observaciones,
        evidencias: [],
        actividades_json: [],
      })
      if (error) throw error
      toast.success('Sesión registrada exitosamente')
      onSave()
      onClose()
    } catch (err) {
      toast.error('Error al guardar la sesión')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const CampoVoz = ({
    campo,
    label,
    rows = 3,
    placeholder,
  }: {
    campo: keyof typeof form
    label: string
    rows?: number
    placeholder: string
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">{label}</label>
        <button
          type="button"
          onClick={() => grabando === campo ? detenerGrabacion() : iniciarGrabacion(campo as string)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
            grabando === campo
              ? 'bg-danger-100 text-danger-600 animate-pulse'
              : 'bg-neutral-100 text-neutral-600 hover:bg-primary-100 hover:text-primary-600'
          }`}
        >
          {grabando === campo ? (
            <><StopIcon className="w-3 h-3" /> Detener</>
          ) : (
            <><MicrophoneIcon className="w-3 h-3" /> Dictar</>
          )}
        </button>
      </div>
      <textarea
        className="input resize-none"
        rows={rows}
        placeholder={placeholder}
        value={form[campo] as string}
        onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
      />
    </div>
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Registrar Sesión</h2>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
              <MicrophoneIcon className="w-3 h-3" />
              Usa el botón de micrófono para dictar por voz
            </p>
          </div>
          <button onClick={onClose} className="btn-icon text-neutral-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Paciente</label>
              <select className="input" value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value, plan_id: '' }))}>
                <option value="">Seleccionar...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Plan terapéutico</label>
              <select className="input" value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
                <option value="">Sin plan</option>
                {planesFiltrados.map(p => (
                  <option key={p.id} value={p.id}>{p.titulo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha y hora</label>
              <input type="datetime-local" className="input" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="label">Duración (minutos)</label>
              <input type="number" className="input" value={form.duracion_minutos} min={15} max={180} step={15}
                onChange={e => setForm(f => ({ ...f, duracion_minutos: parseInt(e.target.value) }))} />
            </div>
          </div>

          <CampoVoz campo="actividades" label="Actividades realizadas *" rows={4}
            placeholder="Describe las actividades terapéuticas realizadas durante la sesión..." />

          <CampoVoz campo="avances" label="Avances observados" rows={3}
            placeholder="Logros y mejoras observadas durante esta sesión..." />

          <CampoVoz campo="dificultades" label="Dificultades presentadas" rows={2}
            placeholder="Obstáculos o áreas que requieren mayor atención..." />

          {/* Estado de ánimo */}
          <div>
            <label className="label">Estado de ánimo del paciente</label>
            <div className="flex gap-2 flex-wrap">
              {ESTADO_ANIMO_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, estado_animo: opt.value }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all border ${
                    form.estado_animo === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-neutral-200 text-neutral-600 hover:border-primary-300'
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cooperación */}
          <div>
            <label className="label">Nivel de cooperación</label>
            <div className="flex gap-2">
              {COOPERACION_OPTS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, nivel_cooperacion: n }))}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border ${
                    form.nivel_cooperacion === n
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-neutral-200 text-neutral-600 hover:border-primary-300'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-neutral-400 self-center ml-2">1=bajo · 5=excelente</span>
            </div>
          </div>

          <CampoVoz campo="tareas_casa" label="Tareas para casa" rows={3}
            placeholder="Actividades recomendadas para realizar en casa hasta la próxima sesión..." />

          <CampoVoz campo="observaciones" label="Observaciones generales" rows={2}
            placeholder="Notas adicionales para el expediente..." />
        </div>

        <div className="flex gap-3 p-5 border-t border-neutral-100 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
            {guardando ? 'Guardando...' : 'Guardar sesión'}
            <CheckCircleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SesionesPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [planes, setPlanes] = useState<PlanTerapeutico[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const [seisRes, pacsRes, planesRes] = await Promise.all([
        supabase.from('sesiones').select(`*, paciente:pacientes(nombre, apellidos), terapeuta:usuarios(nombre), plan:planes_terapeuticos(titulo)`).eq('clinica_id', usuario.clinica_id).order('fecha', { ascending: false }).limit(50),
        supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).eq('activo', true).order('nombre'),
        supabase.from('planes_terapeuticos').select('id, titulo, paciente_id').eq('clinica_id', usuario.clinica_id).eq('estado', 'activo'),
      ])

      setSesiones((seisRes.data || []) as unknown as Sesion[])
      setPacientes((pacsRes.data || []) as Paciente[])
      setPlanes((planesRes.data || []) as unknown as PlanTerapeutico[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cooperacionColor = (n?: number) => {
    if (!n) return 'text-neutral-400'
    if (n >= 4) return 'text-success-600'
    if (n >= 3) return 'text-warning-600'
    return 'text-danger-600'
  }

  const estadoAnimoEmoji: Record<string, string> = {
    excelente: '😊', bueno: '🙂', regular: '😐', difícil: '😟', muy_difícil: '😢',
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sesiones</h1>
          <p className="page-subtitle">{sesiones.length} sesiones registradas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Registrar sesión
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100">
                <div className="skeleton w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div>
              </div>
            ))}
          </div>
        ) : sesiones.length === 0 ? (
          <div className="empty-state py-14">
            <ClipboardDocumentListIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin sesiones registradas</p>
            <p className="empty-state-desc">Registra la primera sesión de terapia</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm mt-4">
              <PlusIcon className="w-4 h-4" /> Registrar sesión
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {sesiones.map(ses => (
              <div key={ses.id} className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex flex-col items-center justify-center shrink-0">
                  <p className="text-sm font-bold text-primary-700 leading-none">
                    {format(new Date(ses.fecha), 'd')}
                  </p>
                  <p className="text-2xs text-primary-500 uppercase font-medium">
                    {format(new Date(ses.fecha), 'MMM', { locale: es })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-neutral-900">
                      {(ses as any).paciente?.nombre} {(ses as any).paciente?.apellidos}
                    </p>
                    <div className="flex items-center gap-2">
                      {ses.estado_animo && (
                        <span title={ses.estado_animo} className="text-base">
                          {estadoAnimoEmoji[ses.estado_animo] || '😐'}
                        </span>
                      )}
                      {ses.nivel_cooperacion && (
                        <span className={`text-xs font-bold ${cooperacionColor(ses.nivel_cooperacion)}`}>
                          ⭐ {ses.nivel_cooperacion}/5
                        </span>
                      )}
                      {ses.duracion_minutos && (
                        <span className="badge badge-neutral text-2xs">
                          {ses.duracion_minutos} min
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {format(new Date(ses.fecha), 'HH:mm')} · {(ses as any).terapeuta?.nombre}
                    {(ses as any).plan && ` · ${(ses as any).plan.titulo}`}
                  </p>
                  {ses.actividades && (
                    <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{ses.actividades}</p>
                  )}
                  {ses.tareas_casa && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <HomeIcon className="w-3 h-3 text-primary-400" />
                      <p className="text-xs text-primary-600 line-clamp-1">{ses.tareas_casa}</p>
                    </div>
                  )}
                </div>
                <Link href={`/sesiones/${ses.id}`} className="btn-ghost btn-sm text-neutral-400 shrink-0">
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalSesion
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pacientes={pacientes}
        planes={planes}
        onSave={fetchData}
      />
    </div>
  )
}
