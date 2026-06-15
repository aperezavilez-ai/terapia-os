'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
  HomeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Paciente, ReporteIA } from '@/types'

type ModoIA = 'reporte' | 'resumen' | 'tareas' | 'analisis' | 'patrones'

const modos: { id: ModoIA; label: string; icon: any; desc: string; color: string }[] = [
  {
    id: 'reporte',
    label: 'Reporte clínico',
    icon: DocumentTextIcon,
    desc: 'Genera un reporte completo de progreso del paciente',
    color: 'primary',
  },
  {
    id: 'resumen',
    label: 'Resumen de expediente',
    icon: ClipboardDocumentListIcon,
    desc: 'Condensa el historial clínico en un resumen ejecutivo',
    color: 'secondary',
  },
  {
    id: 'tareas',
    label: 'Tareas para casa',
    icon: HomeIcon,
    desc: 'Genera actividades personalizadas para el paciente en casa',
    color: 'success',
  },
  {
    id: 'analisis',
    label: 'Análisis de sesiones',
    icon: ChartBarIcon,
    desc: 'Detecta avances y áreas de mejora en las últimas sesiones',
    color: 'warning',
  },
  {
    id: 'patrones',
    label: 'Detección de patrones',
    icon: LightBulbIcon,
    desc: 'Identifica patrones conductuales y clínicos recurrentes',
    color: 'danger',
  },
]

const PERIODO_OPTS = [
  { value: '7', label: 'Última semana' },
  { value: '30', label: 'Último mes' },
  { value: '90', label: 'Último trimestre' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último año' },
]

export default function IAClinicaPage() {
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoIA>('reporte')
  const [pacienteId, setPacienteId] = useState('')
  const [periodo, setPeriodo] = useState('30')
  const [instrucciones, setInstrucciones] = useState('')
  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState<ReporteIA | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [historial, setHistorial] = useState<ReporteIA[]>([])
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
        .select('clinica_id')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      const [pacs, reportes] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', usuario.clinica_id).eq('activo', true).order('nombre'),
        supabase.from('reportes_ia').select(`*, paciente:pacientes(nombre, apellidos)`).eq('clinica_id', usuario.clinica_id).order('created_at', { ascending: false }).limit(20),
      ])

      setPacientes((pacs.data || []) as Paciente[])
      setHistorial((reportes.data || []) as unknown as ReporteIA[])
    } catch (err) {
      console.error('Error fetching IA data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generarReporte = async () => {
    if (!pacienteId) {
      toast.error('Selecciona un paciente')
      return
    }

    setGenerando(true)
    setResultado(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      // Obtener datos del paciente para el contexto
      const [pacRes, sesionesRes, planesRes, evalsRes] = await Promise.all([
        supabase.from('pacientes').select(`
          nombre, apellidos, fecha_nacimiento, diagnosticos, medicamentos, motivo_consulta
        `).eq('id', pacienteId).single(),
        supabase.from('sesiones').select('fecha, actividades, avances, dificultades, observaciones, tareas_casa').eq('paciente_id', pacienteId).order('fecha', { ascending: false }).limit(20),
        supabase.from('planes_terapeuticos').select(`
          titulo, objetivo_general, porcentaje_avance, estado,
          objetivos(descripcion, estado, porcentaje)
        `).eq('paciente_id', pacienteId).eq('estado', 'activo'),
        supabase.from('evaluaciones').select('tipo, fecha, porcentaje, nivel, observaciones').eq('paciente_id', pacienteId).order('fecha', { ascending: false }).limit(5),
      ])

      const paciente = pacRes.data
      const sesiones = sesionesRes.data || []
      const planes = planesRes.data || []
      const evaluaciones = evalsRes.data || []

      const contexto = `
PACIENTE: ${paciente?.nombre} ${paciente?.apellidos}
DIAGNÓSTICOS: ${JSON.stringify(paciente?.diagnosticos)}
MOTIVO DE CONSULTA: ${paciente?.motivo_consulta}

PLANES TERAPÉUTICOS ACTIVOS:
${planes.map((p: any) => `- ${p.titulo}: ${p.porcentaje_avance}% avance
  Objetivo: ${p.objetivo_general}
  Objetivos específicos: ${p.objetivos?.map((o: any) => `${o.descripcion} (${o.estado}, ${o.porcentaje}%)`).join('; ')}`).join('\n')}

ÚLTIMAS ${sesiones.length} SESIONES:
${sesiones.map((s: any) => `- ${new Date(s.fecha).toLocaleDateString('es-MX')}: ${s.actividades}
  Avances: ${s.avances}
  Dificultades: ${s.dificultades}
  Tareas: ${s.tareas_casa}`).join('\n')}

EVALUACIONES RECIENTES:
${evaluaciones.map((e: any) => `- ${e.tipo}: ${e.porcentaje}% (${e.nivel})`).join('\n')}

PERÍODO DE ANÁLISIS: ${periodo} días
${instrucciones ? `INSTRUCCIONES ADICIONALES: ${instrucciones}` : ''}
      `.trim()

      const prompts: Record<ModoIA, string> = {
        reporte: `Eres un especialista en terapia ocupacional infantil. Genera un reporte clínico profesional y detallado en español basado en los siguientes datos del paciente. Incluye: resumen clínico, avances observados, áreas de dificultad, análisis de cumplimiento de objetivos, recomendaciones específicas y próximos pasos. El reporte debe ser adecuado para compartir con los padres y otros profesionales de la salud.`,
        resumen: `Eres un especialista en terapia ocupacional infantil. Genera un resumen ejecutivo claro y conciso del expediente del paciente. Incluye los puntos más relevantes: diagnósticos, situación actual, avances más significativos y próximas prioridades terapéuticas.`,
        tareas: `Eres un especialista en terapia ocupacional infantil. Basándote en los datos del paciente, genera una lista de 5-8 actividades terapéuticas personalizadas para realizar en casa. Para cada actividad incluye: nombre, objetivo terapéutico, materiales necesarios, instrucciones paso a paso, y frecuencia recomendada. Las actividades deben ser apropiadas para la edad y diagnóstico del paciente.`,
        analisis: `Eres un especialista en terapia ocupacional infantil. Analiza las sesiones recientes del paciente e identifica: 1) Avances más significativos, 2) Áreas que requieren mayor atención, 3) Patrones de progreso o regresión, 4) Efectividad de las actividades actuales, 5) Ajustes recomendados al plan terapéutico.`,
        patrones: `Eres un especialista en terapia ocupacional infantil. Analiza el historial completo del paciente e identifica patrones clínicos importantes: conductuales, sensoriales, de asistencia, de respuesta a diferentes tipos de actividades, y cualquier correlación relevante entre variables. Presenta tus hallazgos de forma estructurada con evidencia específica.`,
      }

      // Llamada a la API de Anthropic (claude)
      const response = await fetch('/api/ia/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: modoSeleccionado,
          contexto,
          prompt: prompts[modoSeleccionado],
        }),
      })

      if (!response.ok) throw new Error('Error en la API de IA')

      const { contenido, tokens } = await response.json()

      // Guardar reporte en la base de datos
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo))

      const { data: reporteGuardado } = await supabase
        .from('reportes_ia')
        .insert({
          paciente_id: pacienteId,
          clinica_id: usuario.clinica_id,
          generado_por: session.user.id,
          tipo: modoSeleccionado === 'reporte' ? 'mensual' : 'progreso',
          periodo_inicio: fechaInicio.toISOString().split('T')[0],
          periodo_fin: new Date().toISOString().split('T')[0],
          titulo: `${modos.find(m => m.id === modoSeleccionado)?.label} - ${pacientes.find(p => p.id === pacienteId)?.nombre}`,
          contenido,
          tokens_usados: tokens,
          modelo_ia: 'claude-sonnet-4-6',
        })
        .select()
        .single()

      if (reporteGuardado) {
        setResultado(reporteGuardado as unknown as ReporteIA)
        toast.success('Reporte generado exitosamente')
        await fetchData()
      }

    } catch (err) {
      console.error('Error generando reporte:', err)
      toast.error('Error al generar el reporte. Verifica la configuración de IA.')
    } finally {
      setGenerando(false)
    }
  }

  const modoConfig = modos.find(m => m.id === modoSeleccionado)!

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">IA Clínica</h1>
          <p className="page-subtitle">Análisis inteligente y reportes automáticos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="space-y-4 lg:col-span-1">
          {/* Modos de IA */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Tipo de análisis
            </p>
            <div className="space-y-1.5">
              {modos.map((modo) => (
                <button
                  key={modo.id}
                  onClick={() => setModoSeleccionado(modo.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                    modoSeleccionado === modo.id
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <modo.icon className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-medium leading-none mb-0.5">{modo.label}</p>
                    <p className={`text-xs ${modoSeleccionado === modo.id ? 'text-primary-200' : 'text-neutral-400'}`}>
                      {modo.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuración */}
          <div className="card p-4 space-y-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Configuración
            </p>
            <div>
              <label className="label">Paciente</label>
              <select
                className="input"
                value={pacienteId}
                onChange={e => setPacienteId(e.target.value)}
              >
                <option value="">Seleccionar paciente...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Período de análisis</label>
              <select
                className="input"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              >
                {PERIODO_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Instrucciones adicionales (opcional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Ej: Enfócate especialmente en el área de motricidad fina..."
                value={instrucciones}
                onChange={e => setInstrucciones(e.target.value)}
              />
            </div>
            <button
              onClick={generarReporte}
              disabled={generando || !pacienteId}
              className="btn-primary w-full"
            >
              {generando ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Analizando con IA...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Generar {modoConfig.label}
                </>
              )}
            </button>
          </div>

          {/* Historial de reportes */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Reportes recientes
              </p>
            </div>
            <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
              {historial.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-6">Sin reportes</p>
              ) : (
                historial.slice(0, 10).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setResultado(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 text-left transition-colors"
                  >
                    <DocumentTextIcon className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {r.titulo || `Reporte ${r.tipo}`}
                      </p>
                      <p className="text-2xs text-neutral-400">
                        {(r as any).paciente?.nombre} · {new Date(r.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel de resultado */}
        <div className="lg:col-span-2">
          {generando ? (
            <div className="card p-8 flex flex-col items-center justify-center text-center h-96">
              <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mb-4 animate-pulse-soft">
                <SparklesIcon className="w-8 h-8 text-secondary-600" />
              </div>
              <p className="text-base font-semibold text-neutral-900 mb-2">Analizando con IA...</p>
              <p className="text-sm text-neutral-500">
                Procesando datos del paciente y generando {modoConfig.label.toLowerCase()}
              </p>
              <div className="flex gap-1.5 mt-6">
                {[0.2, 0.4, 0.6].map((d, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}s` }}
                  />
                ))}
              </div>
            </div>
          ) : resultado ? (
            <div className="card overflow-hidden">
              {/* Header del resultado */}
              <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-success-100 rounded-xl flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {resultado.titulo || modoConfig.label}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Generado: {new Date(resultado.created_at).toLocaleString('es-MX')}
                      {resultado.tokens_usados && ` · ${resultado.tokens_usados} tokens`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      // Descargar PDF
                      window.print()
                    }}
                    className="btn-secondary btn-sm"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Contenido del reporte */}
              <div className="p-6">
                <div className="prose prose-sm max-w-none text-neutral-800">
                  {resultado.contenido.split('\n').map((linea, i) => {
                    if (linea.startsWith('###')) {
                      return <h3 key={i} className="text-sm font-bold text-neutral-900 mt-4 mb-2">{linea.replace('###', '').trim()}</h3>
                    }
                    if (linea.startsWith('##')) {
                      return <h2 key={i} className="text-base font-bold text-neutral-900 mt-5 mb-2">{linea.replace('##', '').trim()}</h2>
                    }
                    if (linea.startsWith('**') && linea.endsWith('**')) {
                      return <p key={i} className="font-semibold text-neutral-900">{linea.replace(/\*\*/g, '')}</p>
                    }
                    if (linea.startsWith('- ') || linea.startsWith('• ')) {
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm text-neutral-700 mb-1">
                          <span className="text-primary-500 mt-0.5">•</span>
                          <span>{linea.substring(2)}</span>
                        </div>
                      )
                    }
                    if (linea.trim() === '') return <div key={i} className="h-2" />
                    return <p key={i} className="text-sm text-neutral-700 leading-relaxed mb-2">{linea}</p>
                  })}
                </div>

                {/* Tareas para casa (si aplica) */}
                {resultado.tareas_casa && resultado.tareas_casa.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <HomeIcon className="w-4 h-4 text-primary-600" />
                      Tareas para casa
                    </h3>
                    <div className="space-y-3">
                      {resultado.tareas_casa.map((tarea, i) => (
                        <div key={i} className="bg-neutral-50 rounded-xl p-4">
                          <p className="text-sm font-semibold text-neutral-900">{tarea.titulo}</p>
                          <p className="text-xs text-neutral-600 mt-1">{tarea.descripcion}</p>
                          <p className="text-xs text-primary-600 mt-1 font-medium">
                            Frecuencia: {tarea.frecuencia}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {resultado.recomendaciones && resultado.recomendaciones.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <LightBulbIcon className="w-4 h-4 text-warning-500" />
                      Recomendaciones
                    </h3>
                    <div className="space-y-2">
                      {resultado.recomendaciones.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                          <CheckCircleIcon className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compartir con padres */}
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={async () => {
                        if (!resultado?.id) return
                        const { error } = await supabase
                          .from('reportes_ia')
                          .update({ enviado_a_padres: true })
                          .eq('id', resultado.id)
                        if (error) toast.error('No se pudo compartir el reporte')
                        else toast.success('Reporte publicado en el portal de padres')
                      }}
                    >
                      Publicar en portal de padres
                    </button>
                    <button className="btn-secondary btn-sm" type="button">
                      Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center h-full min-h-96">
              <div className="w-20 h-20 bg-secondary-50 rounded-3xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-10 h-10 text-secondary-400" />
              </div>
              <h2 className="text-base font-semibold text-neutral-900 mb-2">
                Asistente de IA Clínica
              </h2>
              <p className="text-sm text-neutral-500 max-w-sm">
                Selecciona un tipo de análisis y un paciente para generar reportes clínicos
                inteligentes, tareas personalizadas y análisis de progreso.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6 text-left max-w-sm">
                {modos.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModoSeleccionado(m.id)}
                    className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <m.icon className="w-4 h-4 text-neutral-400 shrink-0" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
