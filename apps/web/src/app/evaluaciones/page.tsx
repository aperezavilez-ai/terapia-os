'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Evaluacion, Paciente, TipoEvaluacion } from '@/types'

const TIPOS_EVAL: { id: TipoEvaluacion; label: string; color: string; icon: string }[] = [
  { id: 'motricidad_fina', label: 'Motricidad Fina', color: '#6366F1', icon: '✋' },
  { id: 'motricidad_gruesa', label: 'Motricidad Gruesa', color: '#8B5CF6', icon: '🏃' },
  { id: 'integracion_sensorial', label: 'Integración Sensorial', color: '#06B6D4', icon: '🧠' },
  { id: 'atencion', label: 'Atención', color: '#10B981', icon: '👁️' },
  { id: 'conducta', label: 'Conducta', color: '#F59E0B', icon: '❤️' },
  { id: 'cognitivo', label: 'Cognitivo', color: '#EF4444', icon: '💡' },
  { id: 'lenguaje', label: 'Lenguaje', color: '#0EA5E9', icon: '🗣️' },
  { id: 'socioafectivo', label: 'Socioafectivo', color: '#EC4899', icon: '🤝' },
]

interface ItemEval {
  id: string
  area: string
  nombre: string
  puntaje_max: number
  puntaje: number
  observacion: string
}

function ModalNuevaEvaluacion({
  open,
  onClose,
  pacientes,
  onSave,
  initialPacienteId = '',
}: {
  open: boolean
  onClose: () => void
  pacientes: Paciente[]
  onSave: () => void
  initialPacienteId?: string
}) {
  const [paso, setPaso] = useState(1)
  const [pacienteId, setPacienteId] = useState(initialPacienteId)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEvaluacion | ''>('')
  const [items, setItems] = useState<ItemEval[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [recomendaciones, setRecomendaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open && initialPacienteId) {
      setPacienteId(initialPacienteId)
      setPaso(1)
    }
  }, [open, initialPacienteId])

  useEffect(() => {
    if (tipoSeleccionado) fetchItems()
  }, [tipoSeleccionado])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('catalogo_items_evaluacion')
      .select('*')
      .eq('tipo_evaluacion', tipoSeleccionado)
      .eq('activo', true)
      .order('orden')

    if (data) {
      setItems(data.map(i => ({
        id: i.id,
        area: i.area,
        nombre: i.nombre,
        puntaje_max: i.puntaje_max,
        puntaje: 0,
        observacion: '',
      })))
    }
  }

  const setPuntaje = (itemId: string, puntaje: number) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, puntaje } : i))
  }

  const calcularPorcentaje = () => {
    if (!items.length) return 0
    const total = items.reduce((sum, i) => sum + i.puntaje, 0)
    const max = items.reduce((sum, i) => sum + i.puntaje_max, 0)
    return max > 0 ? (total / max) * 100 : 0
  }

  const calcularNivel = (pct: number): string => {
    if (pct < 40) return 'bajo'
    if (pct < 65) return 'medio'
    if (pct < 85) return 'alto'
    return 'muy_alto'
  }

  const handleGuardar = async () => {
    if (!pacienteId || !tipoSeleccionado) return
    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return

      const porcentaje = calcularPorcentaje()
      const puntuacionTotal = items.reduce((s, i) => s + i.puntaje, 0)
      const puntuacionMax = items.reduce((s, i) => s + i.puntaje_max, 0)

      const { error } = await supabase.from('evaluaciones').insert({
        paciente_id: pacienteId,
        terapeuta_id: session.user.id,
        clinica_id: usuario.clinica_id,
        tipo: tipoSeleccionado,
        fecha: new Date().toISOString(),
        puntuacion_total: puntuacionTotal,
        puntuacion_max: puntuacionMax,
        porcentaje: parseFloat(porcentaje.toFixed(2)),
        nivel: calcularNivel(porcentaje),
        items: items.map(i => ({
          id: i.id,
          area: i.area,
          nombre: i.nombre,
          puntuacion: i.puntaje,
          puntuacion_max: i.puntaje_max,
          observacion: i.observacion,
        })),
        observaciones,
        recomendaciones,
      })

      if (error) throw error
      toast.success('Evaluación guardada exitosamente')
      onSave()
      onClose()
      setPaso(1)
      setPacienteId('')
      setTipoSeleccionado('')
      setItems([])
    } catch (err) {
      toast.error('Error al guardar la evaluación')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  if (!open) return null

  const porcentaje = calcularPorcentaje()
  const itemsPorArea = items.reduce<Record<string, ItemEval[]>>((acc, item) => {
    if (!acc[item.area]) acc[item.area] = []
    acc[item.area].push(item)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-modal w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Nueva Evaluación</h2>
            <p className="text-xs text-neutral-500">Paso {paso} de 3</p>
          </div>
          <button onClick={onClose} className="btn-icon text-neutral-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="progress-bar mx-5 mt-3 shrink-0">
          <div className="progress-fill bg-primary-500" style={{ width: `${(paso / 3) * 100}%` }} />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Paso 1: Selección */}
          {paso === 1 && (
            <div className="space-y-5">
              <div>
                <label className="label">Paciente</label>
                <select className="input" value={pacienteId} onChange={e => setPacienteId(e.target.value)}>
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Área de evaluación</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-2">
                  {TIPOS_EVAL.map(tipo => (
                    <button
                      key={tipo.id}
                      onClick={() => setTipoSeleccionado(tipo.id)}
                      className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                        tipoSeleccionado === tipo.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{tipo.icon}</div>
                      <p className="text-xs sm:text-sm font-medium text-neutral-900">{tipo.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Calificación de ítems */}
          {paso === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-900">
                  {TIPOS_EVAL.find(t => t.id === tipoSeleccionado)?.label}
                </p>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: TIPOS_EVAL.find(t => t.id === tipoSeleccionado)?.color }}>
                    {porcentaje.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-400">Progreso actual</p>
                </div>
              </div>

              {Object.entries(itemsPorArea).map(([area, areaItems]) => (
                <div key={area} className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{area}</p>
                  {areaItems.map(item => (
                    <div key={item.id} className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-neutral-900 mb-3">{item.nombre}</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: item.puntaje_max + 1 }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setPuntaje(item.id, i)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-sm font-bold transition-all ${
                              item.puntaje === i
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary-300'
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                        <div className="ml-auto text-xs text-neutral-400 self-end pb-1">
                          / {item.puntaje_max}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Paso 3: Observaciones y resumen */}
          {paso === 3 && (
            <div className="space-y-5">
              {/* Resultado visual */}
              <div className="card p-5 text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: `conic-gradient(${TIPOS_EVAL.find(t => t.id === tipoSeleccionado)?.color || '#6366F1'} ${porcentaje * 3.6}deg, #F1F5F9 0deg)`,
                  }}
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-neutral-900">{porcentaje.toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  Nivel: <span className="text-primary-600 capitalize">{calcularNivel(porcentaje).replace('_', ' ')}</span>
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {items.reduce((s, i) => s + i.puntaje, 0)} / {items.reduce((s, i) => s + i.puntaje_max, 0)} puntos totales
                </p>
              </div>

              <div>
                <label className="label">Observaciones clínicas</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Describe el comportamiento del niño durante la evaluación, aspectos relevantes observados..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Recomendaciones</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Recomendaciones para el plan terapéutico basadas en esta evaluación..."
                  value={recomendaciones}
                  onChange={e => setRecomendaciones(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-neutral-100 shrink-0">
          {paso > 1 && (
            <button onClick={() => setPaso(p => p - 1)} className="btn-secondary">
              Anterior
            </button>
          )}
          <div className="flex-1" />
          {paso < 3 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              disabled={paso === 1 && (!pacienteId || !tipoSeleccionado)}
              className="btn-primary disabled:opacity-50"
            >
              Siguiente
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleGuardar} disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : 'Guardar evaluación'}
              <CheckCircleIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EvaluacionesPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [initialPacienteId, setInitialPacienteId] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    const params = new URLSearchParams(window.location.search)
    if (params.get('nueva') === '1') {
      setModalOpen(true)
      const paciente = params.get('paciente')
      if (paciente) setInitialPacienteId(paciente)
    }
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

      const evalsQuery = supabase
        .from('evaluaciones')
        .select(`*, paciente:pacientes(nombre, apellidos), terapeuta:usuarios(nombre)`)
        .eq('clinica_id', usuario.clinica_id)
        .order('fecha', { ascending: false })
        .limit(50)

      const pacsQuery = supabase
        .from('pacientes')
        .select('id, nombre, apellidos')
        .eq('clinica_id', usuario.clinica_id)
        .eq('activo', true)
        .order('nombre')

      if (usuario.rol === 'terapeuta') {
        evalsQuery.eq('terapeuta_id', session.user.id)
        pacsQuery.eq('terapeuta_asignado_id', session.user.id)
      }

      const [evals, pacs] = await Promise.all([evalsQuery, pacsQuery])

      setEvaluaciones((evals.data || []) as unknown as Evaluacion[])
      setPacientes((pacs.data || []) as Paciente[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const evaluacionesFiltradas = filtroTipo === 'todos'
    ? evaluaciones
    : evaluaciones.filter(e => e.tipo === filtroTipo)

  const statsAreas = TIPOS_EVAL.map(tipo => ({
    area: tipo.label,
    count: evaluaciones.filter(e => e.tipo === tipo.id).length,
    promedio: (() => {
      const evsDelTipo = evaluaciones.filter(e => e.tipo === tipo.id && e.porcentaje != null)
      return evsDelTipo.length ? evsDelTipo.reduce((s, e) => s + (e.porcentaje || 0), 0) / evsDelTipo.length : 0
    })(),
    color: tipo.color,
  }))

  const nivelColor: Record<string, string> = {
    bajo: 'badge-danger',
    medio: 'badge-warning',
    alto: 'badge-success',
    muy_alto: 'badge-primary',
  }
  const nivelLabel: Record<string, string> = {
    bajo: 'Bajo', medio: 'Medio', alto: 'Alto', muy_alto: 'Muy alto',
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluaciones</h1>
          <p className="page-subtitle">{evaluaciones.length} evaluaciones registradas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary w-full sm:w-auto justify-center">
          <PlusIcon className="w-4 h-4" />
          Nueva evaluación
        </button>
      </div>

      {/* Resumen por área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Promedios por área</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={statsAreas}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Radar name="Promedio" dataKey="promedio" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Evaluaciones por área</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statsAreas} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" name="Evaluaciones" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroTipo('todos')}
          className={`btn btn-sm ${filtroTipo === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Todas
        </button>
        {TIPOS_EVAL.map(tipo => (
          <button
            key={tipo.id}
            onClick={() => setFiltroTipo(tipo.id)}
            className={`btn btn-sm ${filtroTipo === tipo.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tipo.icon} {tipo.label}
          </button>
        ))}
      </div>

      {/* Lista de evaluaciones */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100">
                <div className="skeleton w-40 h-4" />
                <div className="skeleton w-24 h-4 ml-auto" />
                <div className="skeleton w-16 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : evaluacionesFiltradas.length === 0 ? (
          <div className="empty-state py-14">
            <ClipboardDocumentListIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin evaluaciones</p>
            <p className="empty-state-desc">Registra la primera evaluación de un paciente</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm mt-4">
              <PlusIcon className="w-4 h-4" /> Nueva evaluación
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {evaluacionesFiltradas.map(ev => {
              const tipoConfig = TIPOS_EVAL.find(t => t.id === ev.tipo)
              return (
                <div key={ev.id} className="flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-neutral-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: tipoConfig?.color + '20' }}>
                    {tipoConfig?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {(ev as any).paciente?.nombre} {(ev as any).paciente?.apellidos}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {tipoConfig?.label} · {format(new Date(ev.fecha), "d MMM yyyy", { locale: es })}
                      {(ev as any).terapeuta && ` · ${(ev as any).terapeuta.nombre}`}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                    {ev.porcentaje != null && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-neutral-900">{ev.porcentaje.toFixed(0)}%</p>
                        <div className="w-16 progress-bar mt-1">
                          <div
                            className="progress-fill"
                            style={{ width: `${ev.porcentaje}%`, background: tipoConfig?.color }}
                          />
                        </div>
                      </div>
                    )}
                    {ev.nivel && (
                      <span className={`badge ${nivelColor[ev.nivel] || 'badge-neutral'}`}>
                        {nivelLabel[ev.nivel] || ev.nivel}
                      </span>
                    )}
                    <Link href={`/evaluaciones/${ev.id}`} className="btn-ghost btn-sm text-neutral-400">
                      <ChartBarIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ModalNuevaEvaluacion
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pacientes={pacientes}
        onSave={fetchData}
        initialPacienteId={initialPacienteId}
      />
    </div>
  )
}
