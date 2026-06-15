'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, dateFnsLocalizer, Event, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Cita, Paciente, Usuario } from '@/types'

const locales = { es }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: es }),
  getDay,
  locales,
})

const COLORS_ESTADO: Record<string, string> = {
  programada: '#818CF8',
  confirmada: '#6366F1',
  en_curso: '#10B981',
  completada: '#22C55E',
  cancelada: '#94A3B8',
  no_asistio: '#EF4444',
}

interface EventoCita extends Event {
  id: string
  estado: string
  tipo: string
  pacienteNombre: string
  terapeuta: string
  duracion: number
}

interface ModalNuevaCitaProps {
  open: boolean
  fechaInicio: Date | null
  onClose: () => void
  onSave: (cita: any) => void
  pacientes: Paciente[]
  terapeutas: Usuario[]
}

function ModalNuevaCita({ open, fechaInicio, onClose, onSave, pacientes, terapeutas }: ModalNuevaCitaProps) {
  const [form, setForm] = useState({
    paciente_id: '',
    terapeuta_id: '',
    fecha_inicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd'T'HH:mm") : '',
    duracion: 60,
    tipo: 'terapia',
    sala: '',
    notas_cita: '',
    costo: '',
  })

  useEffect(() => {
    if (fechaInicio) {
      setForm(f => ({ ...f, fecha_inicio: format(fechaInicio, "yyyy-MM-dd'T'HH:mm") }))
    }
  }, [fechaInicio])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.paciente_id || !form.terapeuta_id || !form.fecha_inicio) {
      toast.error('Completa los campos requeridos')
      return
    }
    const inicio = new Date(form.fecha_inicio)
    const fin = addHours(inicio, form.duracion / 60)
    onSave({
      ...form,
      fecha_inicio: inicio.toISOString(),
      fecha_fin: fin.toISOString(),
      duracion_minutos: form.duracion,
      costo: form.costo ? parseFloat(form.costo) : null,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Nueva cita</h2>
          <button onClick={onClose} className="btn-icon text-neutral-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Paciente *</label>
            <select
              className="input"
              value={form.paciente_id}
              onChange={e => setForm({ ...form, paciente_id: e.target.value })}
              required
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellidos}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Terapeuta *</label>
            <select
              className="input"
              value={form.terapeuta_id}
              onChange={e => setForm({ ...form, terapeuta_id: e.target.value })}
              required
            >
              <option value="">Seleccionar terapeuta</option>
              {terapeutas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.apellidos}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha y hora *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.fecha_inicio}
                onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Duración (min)</label>
              <select
                className="input"
                value={form.duracion}
                onChange={e => setForm({ ...form, duracion: parseInt(e.target.value) })}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de cita</label>
              <select
                className="input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="terapia">Terapia</option>
                <option value="evaluacion">Evaluación</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="valoracion">Valoración inicial</option>
              </select>
            </div>
            <div>
              <label className="label">Sala / Área</label>
              <input
                type="text"
                className="input"
                placeholder="Sala 1"
                value={form.sala}
                onChange={e => setForm({ ...form, sala: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Costo ($)</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={form.costo}
              onChange={e => setForm({ ...form, costo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Observaciones para esta cita..."
              value={form.notas_cita}
              onChange={e => setForm({ ...form, notas_cita: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1">
              Agendar cita
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const [eventos, setEventos] = useState<EventoCita[]>([])
  const [vistaActual, setVistaActual] = useState<View>('week')
  const [fechaActual, setFechaActual] = useState(new Date())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoCita | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [terapeutas, setTerapeutas] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id, rol')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      // Cargar pacientes y terapeutas en paralelo
      const [pacientesRes, terapeutasRes] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).eq('activo', true).order('nombre'),
        supabase.from('usuarios').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).in('rol', ['terapeuta', 'director_clinico']).eq('activo', true),
      ])

      setPacientes((pacientesRes.data || []) as Paciente[])
      setTerapeutas((terapeutasRes.data || []) as Usuario[])

      await fetchCitas(usuario.clinica_id)
    } catch (err) {
      console.error('Error fetching agenda:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCitas = async (clinicaId: string) => {
    const inicio = startOfWeek(fechaActual, { weekStartsOn: 1 })
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 30)

    const { data } = await supabase
      .from('citas')
      .select(`
        id, fecha_inicio, fecha_fin, estado, tipo, notas_cita, duracion_minutos,
        paciente:pacientes(nombre, apellidos),
        terapeuta:usuarios(nombre, apellidos)
      `)
      .eq('clinica_id', clinicaId)
      .gte('fecha_inicio', inicio.toISOString())
      .lte('fecha_inicio', fin.toISOString())
      .not('estado', 'in', '("cancelada","no_asistio")')

    if (data) {
      setEventos(
        data.map((c: any) => ({
          id: c.id,
          title: `${c.paciente?.nombre} ${c.paciente?.apellidos}`,
          start: new Date(c.fecha_inicio),
          end: new Date(c.fecha_fin),
          estado: c.estado,
          tipo: c.tipo,
          pacienteNombre: `${c.paciente?.nombre} ${c.paciente?.apellidos}`,
          terapeuta: `${c.terapeuta?.nombre} ${c.terapeuta?.apellidos || ''}`,
          duracion: c.duracion_minutos,
        }))
      )
    }
  }

  const handleSeleccionarSlot = ({ start }: { start: Date }) => {
    setFechaSeleccionada(start)
    setModalAbierto(true)
  }

  const handleGuardarCita = async (formData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id, sucursal_id')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      const { error } = await supabase.from('citas').insert({
        ...formData,
        clinica_id: usuario.clinica_id,
        sucursal_id: usuario.sucursal_id,
        estado: 'programada',
      })

      if (error) throw error

      toast.success('Cita agendada exitosamente')
      setModalAbierto(false)
      await fetchCitas(usuario.clinica_id)
    } catch (err) {
      toast.error('Error al agendar la cita')
      console.error(err)
    }
  }

  const eventStyleGetter = (event: EventoCita) => ({
    style: {
      backgroundColor: COLORS_ESTADO[event.estado] || '#6366F1',
      borderRadius: '8px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '500',
      padding: '2px 6px',
    },
  })

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Gestión de citas y terapias</p>
        </div>
        <button
          onClick={() => { setFechaSeleccionada(new Date()); setModalAbierto(true) }}
          className="btn-primary"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva cita
        </button>
      </div>

      {/* Calendario */}
      <div className="card p-5">
        {/* Controles del calendario */}
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setFechaActual(new Date())} className="btn-secondary btn-sm">
              Hoy
            </button>
            <button
              onClick={() => {
                const d = new Date(fechaActual)
                d.setDate(d.getDate() - (vistaActual === 'week' ? 7 : vistaActual === 'day' ? 1 : 30))
                setFechaActual(d)
              }}
              className="btn-icon btn-secondary"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const d = new Date(fechaActual)
                d.setDate(d.getDate() + (vistaActual === 'week' ? 7 : vistaActual === 'day' ? 1 : 30))
                setFechaActual(d)
              }}
              className="btn-icon btn-secondary"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-neutral-900 capitalize">
              {format(fechaActual, vistaActual === 'month' ? 'MMMM yyyy' : "d 'de' MMMM yyyy", { locale: es })}
            </span>
          </div>
          <div className="flex gap-1.5">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setVistaActual(v)}
                className={`btn btn-sm ${vistaActual === v ? 'btn-primary' : 'btn-secondary'}`}
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(COLORS_ESTADO).map(([estado, color]) => (
            <div key={estado} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-neutral-500 capitalize">{estado.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="skeleton h-[500px] w-full" />
        ) : (
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 550 }}
            view={vistaActual}
            onView={setVistaActual}
            date={fechaActual}
            onNavigate={setFechaActual}
            onSelectSlot={handleSeleccionarSlot}
            onSelectEvent={(ev: any) => setEventoSeleccionado(ev)}
            selectable
            eventPropGetter={eventStyleGetter as any}
            messages={{
              today: 'Hoy',
              previous: 'Anterior',
              next: 'Siguiente',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              noEventsInRange: 'Sin citas en este período',
            }}
            min={new Date(0, 0, 0, 7, 0, 0)}
            max={new Date(0, 0, 0, 21, 0, 0)}
            step={30}
            timeslots={2}
          />
        )}
      </div>

      {/* Modal nueva cita */}
      <ModalNuevaCita
        open={modalAbierto}
        fechaInicio={fechaSeleccionada}
        onClose={() => setModalAbierto(false)}
        onSave={handleGuardarCita}
        pacientes={pacientes}
        terapeutas={terapeutas}
      />

      {/* Panel detalle evento */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEventoSeleccionado(null)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ background: COLORS_ESTADO[eventoSeleccionado.estado] }}
              />
              <h2 className="text-base font-semibold text-neutral-900 flex-1">
                {eventoSeleccionado.pacienteNombre}
              </h2>
              <button onClick={() => setEventoSeleccionado(null)} className="btn-icon text-neutral-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <CalendarDaysIcon className="w-4 h-4 text-neutral-400" />
                {format(eventoSeleccionado.start as Date, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <ClockIcon className="w-4 h-4 text-neutral-400" />
                {eventoSeleccionado.duracion} minutos · {eventoSeleccionado.tipo}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <UserIcon className="w-4 h-4 text-neutral-400" />
                {eventoSeleccionado.terapeuta}
              </div>
              <div className="pt-3 flex gap-2">
                <button className="btn-secondary flex-1 btn-sm">Cancelar cita</button>
                <button className="btn-primary flex-1 btn-sm">Registrar sesión</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
