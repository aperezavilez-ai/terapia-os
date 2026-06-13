'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  UserCircleIcon,
  PhoneIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  PencilIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowLeftIcon,
  BeakerIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Paciente, Familiar, ArchivoPaciente, Cita, Evaluacion, PlanTerapeutico } from '@/types'

type Tab = 'expediente' | 'clinico' | 'familiares' | 'citas' | 'evaluaciones' | 'planes' | 'sesiones' | 'archivos'

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'expediente', label: 'Expediente', icon: UserCircleIcon },
  { id: 'clinico', label: 'Clínico', icon: BeakerIcon },
  { id: 'familiares', label: 'Familia', icon: HeartIcon },
  { id: 'citas', label: 'Citas', icon: CalendarDaysIcon },
  { id: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardDocumentListIcon },
  { id: 'planes', label: 'Planes', icon: DocumentTextIcon },
  { id: 'sesiones', label: 'Sesiones', icon: ChartBarIcon },
  { id: 'archivos', label: 'Archivos', icon: PhotoIcon },
]

export default function ExpedientePaciente() {
  const params = useParams()
  const pacienteId = params?.id as string
  const [tabActiva, setTabActiva] = useState<Tab>('expediente')
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [familiares, setFamiliares] = useState<Familiar[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [planes, setPlanes] = useState<PlanTerapeutico[]>([])
  const [archivos, setArchivos] = useState<ArchivoPaciente[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (pacienteId) fetchExpediente()
  }, [pacienteId])

  const fetchExpediente = async () => {
    try {
      // Paciente base
      const { data: pac } = await supabase
        .from('pacientes')
        .select(`
          *,
          terapeuta_asignado:usuarios(id, nombre, apellidos, foto_url, email),
          sucursal:sucursales(nombre)
        `)
        .eq('id', pacienteId)
        .single()

      if (pac) setPaciente(pac as unknown as Paciente)

      // Familiares
      const { data: fams } = await supabase
        .from('familiares')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('es_contacto_principal', { ascending: false })

      setFamiliares((fams || []) as Familiar[])

      // Últimas citas
      const { data: citasData } = await supabase
        .from('citas')
        .select(`*, terapeuta:usuarios(nombre, apellidos)`)
        .eq('paciente_id', pacienteId)
        .order('fecha_inicio', { ascending: false })
        .limit(10)

      setCitas((citasData || []) as unknown as Cita[])

      // Evaluaciones
      const { data: evals } = await supabase
        .from('evaluaciones')
        .select(`*, terapeuta:usuarios(nombre)`)
        .eq('paciente_id', pacienteId)
        .order('fecha', { ascending: false })

      setEvaluaciones((evals || []) as unknown as Evaluacion[])

      // Planes terapéuticos
      const { data: planesData } = await supabase
        .from('planes_terapeuticos')
        .select(`*, objetivos(id, estado, porcentaje)`)
        .eq('paciente_id', pacienteId)
        .order('fecha_inicio', { ascending: false })

      setPlanes((planesData || []) as unknown as PlanTerapeutico[])

      // Archivos
      const { data: archivosData } = await supabase
        .from('archivos_paciente')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })

      setArchivos((archivosData || []) as ArchivoPaciente[])

    } catch (err) {
      console.error('Error fetching expediente:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="empty-state py-24">
        <UserCircleIcon className="empty-state-icon" />
        <p className="empty-state-title">Paciente no encontrado</p>
        <Link href="/pacientes" className="btn-secondary btn-sm mt-4">
          <ArrowLeftIcon className="w-4 h-4" />
          Volver a pacientes
        </Link>
      </div>
    )
  }

  const edad = differenceInYears(new Date(), new Date(paciente.fecha_nacimiento))

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/pacientes" className="text-neutral-500 hover:text-neutral-700">Pacientes</Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-medium">{paciente.nombre} {paciente.apellidos}</span>
      </div>

      {/* Header del paciente */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Foto */}
          <div className="shrink-0">
            {paciente.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={paciente.foto_url}
                alt={paciente.nombre}
                className="w-24 h-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-600">
                  {paciente.nombre[0]}{paciente.apellidos[0]}
                </span>
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">
                  {paciente.nombre} {paciente.apellidos}
                </h1>
                <p className="text-neutral-500 text-sm mt-0.5">
                  {edad} años · {format(new Date(paciente.fecha_nacimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                {paciente.curp && (
                  <p className="text-xs text-neutral-400 mt-1 font-mono">CURP: {paciente.curp}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/agenda?paciente=${paciente.id}`} className="btn-secondary btn-sm">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Agendar
                </Link>
                <Link href={`/pacientes/${paciente.id}/editar`} className="btn-primary btn-sm">
                  <PencilIcon className="w-4 h-4" />
                  Editar
                </Link>
              </div>
            </div>

            {/* Datos rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-100">
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Escuela</p>
                <p className="text-sm font-medium text-neutral-700 truncate">
                  {paciente.escuela || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Grado</p>
                <p className="text-sm font-medium text-neutral-700">
                  {paciente.grado_escolar || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Terapeuta</p>
                <p className="text-sm font-medium text-neutral-700 truncate">
                  {(paciente as any).terapeuta_asignado?.nombre || 'Sin asignar'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-0.5">Estado</p>
                <span className={`badge ${paciente.activo ? 'badge-success' : 'badge-neutral'}`}>
                  {paciente.activo ? 'Activo' : 'Dado de baja'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tabActiva === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="animate-fade-in">
        {tabActiva === 'expediente' && (
          <TabExpediente paciente={paciente} />
        )}
        {tabActiva === 'clinico' && (
          <TabClinico paciente={paciente} />
        )}
        {tabActiva === 'familiares' && (
          <TabFamiliares familiares={familiares} pacienteId={paciente.id} />
        )}
        {tabActiva === 'citas' && (
          <TabCitas citas={citas} pacienteId={paciente.id} />
        )}
        {tabActiva === 'evaluaciones' && (
          <TabEvaluaciones evaluaciones={evaluaciones} pacienteId={paciente.id} />
        )}
        {tabActiva === 'planes' && (
          <TabPlanes planes={planes} pacienteId={paciente.id} />
        )}
        {tabActiva === 'archivos' && (
          <TabArchivos archivos={archivos} pacienteId={paciente.id} />
        )}
      </div>
    </div>
  )
}

// ============================================================
// TAB: DATOS PERSONALES
// ============================================================
function TabExpediente({ paciente }: { paciente: Paciente }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">Datos personales</h3>
        <div className="space-y-3">
          {[
            { label: 'Nombre completo', value: `${paciente.nombre} ${paciente.apellidos}` },
            { label: 'CURP', value: paciente.curp || '—' },
            { label: 'Género', value: paciente.genero || '—' },
            { label: 'Fecha de nacimiento', value: format(new Date(paciente.fecha_nacimiento), "d 'de' MMMM 'de' yyyy", { locale: es }) },
            { label: 'Escuela', value: paciente.escuela || '—' },
            { label: 'Grado escolar', value: paciente.grado_escolar || '—' },
            { label: 'Turno', value: paciente.turno_escolar || '—' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between gap-4">
              <span className="text-xs text-neutral-500 shrink-0">{item.label}</span>
              <span className="text-sm text-neutral-900 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">Información clínica inicial</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Motivo de consulta</p>
            <p className="text-sm text-neutral-800">{paciente.motivo_consulta || 'No registrado'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Alergias</p>
            <div className="flex flex-wrap gap-1.5">
              {paciente.alergias?.length
                ? paciente.alergias.map((a, i) => (
                    <span key={i} className="badge badge-warning">{a}</span>
                  ))
                : <span className="text-sm text-neutral-400">Sin alergias registradas</span>
              }
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Fecha de inicio</p>
            <p className="text-sm text-neutral-800">
              {paciente.fecha_inicio ? format(new Date(paciente.fecha_inicio), "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TAB: INFO CLÍNICA
// ============================================================
function TabClinico({ paciente }: { paciente: Paciente }) {
  return (
    <div className="space-y-5">
      {/* Diagnósticos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900">Diagnósticos</h3>
          <button className="btn-secondary btn-sm">
            <PlusIcon className="w-4 h-4" /> Agregar
          </button>
        </div>
        {paciente.diagnosticos?.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Sin diagnósticos registrados</p>
        ) : (
          <div className="space-y-3">
            {paciente.diagnosticos?.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-4 p-3 bg-neutral-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{d.nombre}</p>
                  {d.codigo && <p className="text-xs text-neutral-400 font-mono mt-0.5">{d.codigo}</p>}
                  {d.medico && <p className="text-xs text-neutral-500 mt-0.5">Dr. {d.medico}</p>}
                </div>
                {d.fecha && (
                  <span className="text-xs text-neutral-400 shrink-0">
                    {format(new Date(d.fecha), 'MMM yyyy', { locale: es })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medicamentos */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-900">Medicamentos</h3>
          <button className="btn-secondary btn-sm">
            <PlusIcon className="w-4 h-4" /> Agregar
          </button>
        </div>
        {paciente.medicamentos?.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Sin medicamentos registrados</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paciente.medicamentos?.map((m, i) => (
              <div key={i} className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-sm font-medium text-neutral-900">{m.nombre}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{m.dosis} · {m.frecuencia}</p>
                {m.prescriptor && <p className="text-xs text-neutral-400 mt-0.5">Recetado por: {m.prescriptor}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Antecedentes */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Antecedentes médicos</h3>
        <p className="text-sm text-neutral-700 whitespace-pre-wrap">
          {paciente.antecedentes || 'Sin antecedentes registrados'}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// TAB: FAMILIARES
// ============================================================
function TabFamiliares({ familiares, pacienteId }: { familiares: Familiar[], pacienteId: string }) {
  const tipoLabel: Record<string, string> = {
    padre: 'Padre',
    madre: 'Madre',
    tutor: 'Tutor',
    emergencia: 'Contacto de emergencia',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-500">{familiares.length} contactos registrados</p>
        <button className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Agregar contacto
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {familiares.map((f) => (
          <div key={f.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="avatar avatar-md">{f.nombre[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {f.nombre} {f.apellidos}
                  </p>
                  <span className="badge badge-neutral text-2xs">
                    {tipoLabel[f.tipo_relacion] || f.tipo_relacion}
                  </span>
                </div>
              </div>
              {f.es_contacto_principal && (
                <span className="badge badge-primary text-2xs">Principal</span>
              )}
            </div>
            <div className="mt-4 space-y-2 pt-4 border-t border-neutral-100">
              {f.telefono && (
                <a href={`tel:${f.telefono}`} className="flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-600">
                  <PhoneIcon className="w-4 h-4 text-neutral-400" />
                  {f.telefono}
                </a>
              )}
              {f.email && (
                <a href={`mailto:${f.email}`} className="flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-600">
                  <DocumentTextIcon className="w-4 h-4 text-neutral-400" />
                  {f.email}
                </a>
              )}
              {f.ocupacion && (
                <p className="text-xs text-neutral-400 flex items-center gap-2">
                  <AcademicCapIcon className="w-4 h-4" />
                  {f.ocupacion}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {f.tiene_acceso_portal ? (
                <span className="badge badge-success text-2xs">Con acceso al portal</span>
              ) : (
                <button className="text-xs text-primary-600 hover:underline">
                  Activar acceso portal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB: CITAS
// ============================================================
function TabCitas({ citas, pacienteId }: { citas: Cita[], pacienteId: string }) {
  const estadoColor: Record<string, string> = {
    programada: 'badge-neutral',
    confirmada: 'badge-primary',
    completada: 'badge-success',
    cancelada: 'badge-danger',
    no_asistio: 'badge-danger',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-500">{citas.length} citas registradas</p>
        <Link href={`/agenda?paciente=${pacienteId}`} className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Nueva cita
        </Link>
      </div>
      <div className="card overflow-hidden">
        {citas.length === 0 ? (
          <div className="empty-state py-12">
            <CalendarDaysIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin citas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {citas.map((cita) => (
              <div key={cita.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="text-center w-12 shrink-0">
                  <p className="text-lg font-bold text-neutral-900">
                    {format(new Date(cita.fecha_inicio), 'd')}
                  </p>
                  <p className="text-xs text-neutral-400 uppercase">
                    {format(new Date(cita.fecha_inicio), 'MMM', { locale: es })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 capitalize">{cita.tipo}</p>
                  <p className="text-xs text-neutral-500">
                    {format(new Date(cita.fecha_inicio), 'HH:mm')} · {(cita as any).terapeuta?.nombre}
                  </p>
                </div>
                <span className={`badge ${estadoColor[cita.estado] || 'badge-neutral'}`}>
                  {cita.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// TAB: EVALUACIONES
// ============================================================
function TabEvaluaciones({ evaluaciones, pacienteId }: { evaluaciones: Evaluacion[], pacienteId: string }) {
  const tipoLabel: Record<string, string> = {
    motricidad_fina: 'Motricidad Fina',
    motricidad_gruesa: 'Motricidad Gruesa',
    integracion_sensorial: 'Integración Sensorial',
    atencion: 'Atención',
    conducta: 'Conducta',
  }

  const nivelColor: Record<string, string> = {
    bajo: 'badge-danger',
    medio: 'badge-warning',
    alto: 'badge-success',
    muy_alto: 'badge-primary',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-500">{evaluaciones.length} evaluaciones</p>
        <Link href={`/evaluaciones/nueva?paciente=${pacienteId}`} className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Nueva evaluación
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {evaluaciones.length === 0 ? (
          <div className="card empty-state py-12">
            <ClipboardDocumentListIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin evaluaciones</p>
          </div>
        ) : (
          evaluaciones.map((ev) => (
            <div key={ev.id} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900">
                    {tipoLabel[ev.tipo] || ev.tipo}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {format(new Date(ev.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    {(ev as any).terapeuta && ` · ${(ev as any).terapeuta.nombre}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {ev.porcentaje != null && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-neutral-900">{ev.porcentaje?.toFixed(0)}%</p>
                      <p className="text-2xs text-neutral-400">Resultado</p>
                    </div>
                  )}
                  {ev.nivel && (
                    <span className={`badge ${nivelColor[ev.nivel] || 'badge-neutral'}`}>
                      {ev.nivel}
                    </span>
                  )}
                </div>
              </div>
              {ev.porcentaje != null && (
                <div className="progress-bar mt-3">
                  <div
                    className="progress-fill bg-primary-500"
                    style={{ width: `${ev.porcentaje}%` }}
                  />
                </div>
              )}
              {ev.observaciones && (
                <p className="text-xs text-neutral-500 mt-3 line-clamp-2">{ev.observaciones}</p>
              )}
              <div className="mt-3 flex gap-2">
                <Link href={`/evaluaciones/${ev.id}`} className="btn-secondary btn-sm">Ver detalle</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// TAB: PLANES TERAPÉUTICOS
// ============================================================
function TabPlanes({ planes, pacienteId }: { planes: PlanTerapeutico[], pacienteId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-500">{planes.length} planes terapéuticos</p>
        <Link href={`/planes/nuevo?paciente=${pacienteId}`} className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Nuevo plan
        </Link>
      </div>
      {planes.length === 0 ? (
        <div className="card empty-state py-12">
          <DocumentTextIcon className="empty-state-icon w-12 h-12" />
          <p className="empty-state-title">Sin planes terapéuticos</p>
        </div>
      ) : (
        planes.map((plan) => {
          const objetivos = (plan as any).objetivos || []
          const logrados = objetivos.filter((o: any) => o.estado === 'logrado').length

          return (
            <div key={plan.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-neutral-900">{plan.titulo}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{plan.objetivo_general}</p>
                </div>
                <span className={`badge shrink-0 ${
                  plan.estado === 'activo' ? 'badge-success' :
                  plan.estado === 'finalizado' ? 'badge-primary' :
                  'badge-neutral'
                }`}>
                  {plan.estado}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{objetivos.length}</p>
                  <p className="text-2xs text-neutral-400">Objetivos</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success-600">{logrados}</p>
                  <p className="text-2xs text-neutral-400">Logrados</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-600">{plan.porcentaje_avance?.toFixed(0)}%</p>
                  <p className="text-2xs text-neutral-400">Avance</p>
                </div>
              </div>
              <div className="progress-bar mt-3">
                <div
                  className="progress-fill bg-primary-500"
                  style={{ width: `${plan.porcentaje_avance}%` }}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/planes/${plan.id}`} className="btn-secondary btn-sm">Ver plan</Link>
                <Link href={`/sesiones/nueva?plan=${plan.id}`} className="btn-primary btn-sm">
                  Registrar sesión
                </Link>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================================
// TAB: ARCHIVOS
// ============================================================
function TabArchivos({ archivos, pacienteId }: { archivos: ArchivoPaciente[], pacienteId: string }) {
  const tipoIcon: Record<string, string> = {
    estudio: '🔬',
    receta: '💊',
    consentimiento: '📋',
    foto: '📸',
    video: '🎥',
    otro: '📎',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-500">{archivos.length} archivos</p>
        <button className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Subir archivo
        </button>
      </div>
      {archivos.length === 0 ? (
        <div className="card empty-state py-12">
          <PhotoIcon className="empty-state-icon w-12 h-12" />
          <p className="empty-state-title">Sin archivos</p>
          <p className="empty-state-desc">Sube estudios, fotografías y documentos del paciente</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {archivos.map((arch) => (
            <a
              key={arch.id}
              href={arch.url}
              target="_blank"
              rel="noreferrer"
              className="card p-4 hover:shadow-card-hover transition-shadow text-center group"
            >
              <div className="text-3xl mb-2">{tipoIcon[arch.tipo || 'otro'] || '📎'}</div>
              <p className="text-xs font-medium text-neutral-800 truncate">{arch.nombre}</p>
              <p className="text-2xs text-neutral-400 mt-1">
                {format(new Date(arch.created_at), 'd MMM yyyy', { locale: es })}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
