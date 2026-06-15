'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { PlanTerapeutico, Paciente } from '@/types'

const AREAS_INTERVENCION = [
  'Motricidad Fina', 'Motricidad Gruesa', 'Integración Sensorial',
  'Atención', 'Conducta', 'Cognitivo', 'Lenguaje', 'Socioafectivo',
]

function ModalNuevoPlan({
  open, onClose, pacientes, onSave,
}: {
  open: boolean
  onClose: () => void
  pacientes: Paciente[]
  onSave: () => void
}) {
  const [form, setForm] = useState({
    paciente_id: '',
    titulo: '',
    objetivo_general: '',
    justificacion: '',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin_estimada: '',
    nivel_funcionamiento: '',
    areas_intervencion: [] as string[],
    notas: '',
  })
  const [objetivos, setObjetivos] = useState([
    { descripcion: '', criterio_logro: '', area: '', fecha_meta: '', tipo: 'especifico' },
  ])
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  const toggleArea = (area: string) => {
    setForm(f => ({
      ...f,
      areas_intervencion: f.areas_intervencion.includes(area)
        ? f.areas_intervencion.filter(a => a !== area)
        : [...f.areas_intervencion, area],
    }))
  }

  const addObjetivo = () => {
    setObjetivos(prev => [...prev, { descripcion: '', criterio_logro: '', area: '', fecha_meta: '', tipo: 'especifico' }])
  }

  const updateObjetivo = (idx: number, campo: string, valor: string) => {
    setObjetivos(prev => prev.map((o, i) => i === idx ? { ...o, [campo]: valor } : o))
  }

  const removeObjetivo = (idx: number) => {
    if (objetivos.length > 1) setObjetivos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleGuardar = async () => {
    if (!form.paciente_id || !form.titulo || !form.objetivo_general) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const { data: plan, error: planError } = await supabase.from('planes_terapeuticos').insert({
        paciente_id: form.paciente_id,
        terapeuta_id: session.user.id,
        clinica_id: usuario.clinica_id,
        titulo: form.titulo,
        objetivo_general: form.objetivo_general,
        justificacion: form.justificacion,
        fecha_inicio: form.fecha_inicio,
        fecha_fin_estimada: form.fecha_fin_estimada || null,
        nivel_funcionamiento: form.nivel_funcionamiento,
        areas_intervencion: form.areas_intervencion,
        notas: form.notas,
        estado: 'activo',
        porcentaje_avance: 0,
      }).select().single()

      if (planError || !plan) throw planError

      // Insertar objetivos
      const objetivosValidos = objetivos.filter(o => o.descripcion.trim())
      if (objetivosValidos.length) {
        await supabase.from('objetivos').insert(
          objetivosValidos.map((o, idx) => ({
            plan_id: plan.id,
            tipo: o.tipo,
            area: o.area || null,
            descripcion: o.descripcion,
            criterio_logro: o.criterio_logro || null,
            fecha_meta: o.fecha_meta || null,
            estado: 'pendiente',
            porcentaje: 0,
            orden: idx,
          }))
        )
      }

      toast.success('Plan terapéutico creado exitosamente')
      onSave()
      onClose()
    } catch (err) {
      toast.error('Error al crear el plan')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 shrink-0">
          <h2 className="text-base font-semibold text-neutral-900">Nuevo Plan Terapéutico</h2>
          <button onClick={onClose} className="btn-icon text-neutral-400"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Paciente *</label>
              <select className="input" value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
                <option value="">Seleccionar paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Título del plan *</label>
              <input className="input" placeholder="Ej: Plan de intervención motricidad fina Q1 2025" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Objetivo general *</label>
              <textarea className="input resize-none" rows={3} placeholder="Describe el objetivo principal de este plan terapéutico..." value={form.objetivo_general} onChange={e => setForm(f => ({ ...f, objetivo_general: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha estimada de fin</label>
              <input type="date" className="input" value={form.fecha_fin_estimada} onChange={e => setForm(f => ({ ...f, fecha_fin_estimada: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Nivel de funcionamiento actual</label>
              <input className="input" placeholder="Describe el nivel funcional actual del paciente" value={form.nivel_funcionamiento} onChange={e => setForm(f => ({ ...f, nivel_funcionamiento: e.target.value }))} />
            </div>
          </div>

          {/* Áreas de intervención */}
          <div>
            <label className="label">Áreas de intervención</label>
            <div className="flex flex-wrap gap-2">
              {AREAS_INTERVENCION.map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`chip transition-all ${
                    form.areas_intervencion.includes(area)
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {form.areas_intervencion.includes(area) && <CheckCircleIcon className="w-3 h-3" />}
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivos específicos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Objetivos específicos</label>
              <button type="button" onClick={addObjetivo} className="btn-secondary btn-sm">
                <PlusIcon className="w-3.5 h-3.5" /> Agregar objetivo
              </button>
            </div>
            <div className="space-y-4">
              {objetivos.map((obj, idx) => (
                <div key={idx} className="bg-neutral-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-600">Objetivo {idx + 1}</p>
                    {objetivos.length > 1 && (
                      <button type="button" onClick={() => removeObjetivo(idx)} className="text-neutral-400 hover:text-danger-500">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input className="input bg-white" placeholder="Describe el objetivo específico..." value={obj.descripcion} onChange={e => updateObjetivo(idx, 'descripcion', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input bg-white" placeholder="Criterio de logro" value={obj.criterio_logro} onChange={e => updateObjetivo(idx, 'criterio_logro', e.target.value)} />
                    <input type="date" className="input bg-white" value={obj.fecha_meta} onChange={e => updateObjetivo(idx, 'fecha_meta', e.target.value)} />
                  </div>
                  <select className="input bg-white" value={obj.area} onChange={e => updateObjetivo(idx, 'area', e.target.value)}>
                    <option value="">Área de intervención...</option>
                    {AREAS_INTERVENCION.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Justificación clínica</label>
            <textarea className="input resize-none" rows={3} placeholder="Fundamentación clínica para este plan..." value={form.justificacion} onChange={e => setForm(f => ({ ...f, justificacion: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-100 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
            {guardando ? 'Creando...' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<PlanTerapeutico[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const [planesRes, pacsRes] = await Promise.all([
        supabase.from('planes_terapeuticos').select(`
          *, 
          paciente:pacientes(nombre, apellidos, foto_url),
          terapeuta:usuarios(nombre),
          objetivos(id, estado, porcentaje, descripcion, area)
        `).eq('clinica_id', usuario.clinica_id).order('created_at', { ascending: false }),
        supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).eq('activo', true).order('nombre'),
      ])
      setPlanes((planesRes.data || []) as unknown as PlanTerapeutico[])
      setPacientes((pacsRes.data || []) as Paciente[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const planesFiltrados = planes.filter(p => filtroEstado === 'todos' ? true : p.estado === filtroEstado)

  const estadoColor: Record<string, string> = {
    activo: 'badge-success',
    pausado: 'badge-warning',
    finalizado: 'badge-primary',
    cancelado: 'badge-neutral',
  }
  const estadoLabel: Record<string, string> = {
    activo: 'Activo', pausado: 'Pausado', finalizado: 'Finalizado', cancelado: 'Cancelado',
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planes Terapéuticos</h1>
          <p className="page-subtitle">{planes.length} planes registrados</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { value: 'todos', label: 'Todos' },
          { value: 'activo', label: 'Activos' },
          { value: 'pausado', label: 'Pausados' },
          { value: 'finalizado', label: 'Finalizados' },
        ].map(f => (
          <button key={f.value} onClick={() => setFiltroEstado(f.value)}
            className={`btn btn-sm ${filtroEstado === f.value ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : planesFiltrados.length === 0 ? (
        <div className="card empty-state py-14">
          <DocumentTextIcon className="empty-state-icon w-12 h-12" />
          <p className="empty-state-title">Sin planes terapéuticos</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm mt-4">
            <PlusIcon className="w-4 h-4" /> Nuevo plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planesFiltrados.map(plan => {
            const objetivos = (plan as any).objetivos || []
            const logrados = objetivos.filter((o: any) => o.estado === 'logrado').length
            const enProgreso = objetivos.filter((o: any) => o.estado === 'en_progreso').length
            const avance = plan.porcentaje_avance || 0

            return (
              <div key={plan.id} className="card p-5 hover:shadow-card-hover transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${estadoColor[plan.estado] || 'badge-neutral'}`}>
                        {estadoLabel[plan.estado] || plan.estado}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1">{plan.titulo}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {(plan as any).paciente?.nombre} {(plan as any).paciente?.apellidos}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-primary-600">{avance.toFixed(0)}%</p>
                    <p className="text-2xs text-neutral-400">avance</p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="progress-bar mb-4">
                  <div className="progress-fill bg-primary-500" style={{ width: `${avance}%` }} />
                </div>

                {/* Objetivos */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-neutral-50 rounded-xl p-2">
                    <p className="text-sm font-bold text-neutral-900">{objetivos.length}</p>
                    <p className="text-2xs text-neutral-400">Total</p>
                  </div>
                  <div className="bg-success-50 rounded-xl p-2">
                    <p className="text-sm font-bold text-success-600">{logrados}</p>
                    <p className="text-2xs text-neutral-400">Logrados</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-2">
                    <p className="text-sm font-bold text-primary-600">{enProgreso}</p>
                    <p className="text-2xs text-neutral-400">En curso</p>
                  </div>
                </div>

                {/* Objetivo general preview */}
                <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{plan.objetivo_general}</p>

                {/* Áreas */}
                {plan.areas_intervencion?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {plan.areas_intervencion.slice(0, 3).map(area => (
                      <span key={area} className="badge badge-neutral text-2xs">{area}</span>
                    ))}
                    {plan.areas_intervencion.length > 3 && (
                      <span className="badge badge-neutral text-2xs">+{plan.areas_intervencion.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Fecha */}
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-4">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    Inicio: {format(new Date(plan.fecha_inicio), 'd MMM yyyy', { locale: es })}
                  </span>
                  {plan.fecha_fin_estimada && (
                    <span>Meta: {format(new Date(plan.fecha_fin_estimada), 'd MMM yyyy', { locale: es })}</span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <Link href={`/planes/${plan.id}`} className="btn-secondary btn-sm flex-1 justify-center">
                    Ver detalle
                  </Link>
                  <Link href={`/sesiones?plan=${plan.id}`} className="btn-primary btn-sm flex-1 justify-center">
                    <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                    Sesión
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ModalNuevoPlan open={modalOpen} onClose={() => setModalOpen(false)} pacientes={pacientes} onSave={fetchData} />
    </div>
  )
}
