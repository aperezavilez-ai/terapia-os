'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  UsersIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, startOfWeek, addDays, endOfWeek, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']

const AREAS_LABEL: Record<string, string> = {
  motricidad_fina: 'Motricidad Fina',
  motricidad_gruesa: 'M. Gruesa',
  integracion_sensorial: 'Sensorial',
  atencion: 'Atención',
  conducta: 'Conducta',
  cognitivo: 'Cognitivo',
  lenguaje: 'Lenguaje',
  socioafectivo: 'Socioafectivo',
}

interface ChartCitas {
  dia: string
  citas: number
  completadas: number
}

interface ChartArea {
  name: string
  value: number
}

interface InsightDashboard {
  tipo: 'warning' | 'info' | 'success'
  titulo: string
  mensaje: string
  link?: string
  linkLabel?: string
}

interface KPI {
  label: string
  value: string | number
  change: number
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
  link: string
}

interface CitaHoy {
  id: string
  hora: string
  paciente: string
  terapeuta: string
  estado: string
  tipo: string
}

interface AlertaDashboard {
  tipo: 'info' | 'warning' | 'danger'
  mensaje: string
  accion?: string
  link?: string
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [citasHoy, setCitasHoy] = useState<CitaHoy[]>([])
  const [alertas, setAlertas] = useState<AlertaDashboard[]>([])
  const [dataCitas, setDataCitas] = useState<ChartCitas[]>([])
  const [dataAreas, setDataAreas] = useState<ChartArea[]>([])
  const [insights, setInsights] = useState<InsightDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaHoy] = useState(new Date())
  const supabase = createClient()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id, rol')
        .eq('id', session.user.id)
        .single()

      if (!usuario) return

      const clinicaId = usuario.clinica_id

      // Pacientes activos
      const { count: pacientesActivos } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('activo', true)

      // Pacientes nuevos este mes
      const inicioMes = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 1).toISOString()
      const { count: pacientesNuevos } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .gte('created_at', inicioMes)

      // Citas de hoy
      const inicioHoy = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), fechaHoy.getDate()).toISOString()
      const finHoy = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), fechaHoy.getDate(), 23, 59, 59).toISOString()

      const { data: citasData, count: totalCitasHoy } = await supabase
        .from('citas')
        .select(`
          id, fecha_inicio, estado, tipo,
          paciente:pacientes(nombre, apellidos),
          terapeuta:usuarios(nombre)
        `, { count: 'exact' })
        .eq('clinica_id', clinicaId)
        .gte('fecha_inicio', inicioHoy)
        .lte('fecha_inicio', finHoy)
        .order('fecha_inicio')

      // Pagos pendientes
      const { count: pagosPendientes } = await supabase
        .from('facturacion')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('estado', 'pendiente')

      // Ingresos del mes
      const { data: ingresos } = await supabase
        .from('facturacion')
        .select('total')
        .eq('clinica_id', clinicaId)
        .eq('estado', 'pagado')
        .gte('fecha_pago', inicioMes)

      const totalIngresos = ingresos?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

      const inicioMesAnterior = startOfMonth(subMonths(fechaHoy, 1)).toISOString()
      const finMesAnterior = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 0, 23, 59, 59).toISOString()
      const { data: ingresosAnterior } = await supabase
        .from('facturacion')
        .select('total')
        .eq('clinica_id', clinicaId)
        .eq('estado', 'pagado')
        .gte('fecha_pago', inicioMesAnterior)
        .lte('fecha_pago', finMesAnterior)

      const totalIngresosAnterior = ingresosAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
      const deltaIngresos = totalIngresosAnterior > 0
        ? Math.round(((totalIngresos - totalIngresosAnterior) / totalIngresosAnterior) * 100)
        : totalIngresos > 0 ? 100 : 0

      setKpis([
        {
          label: 'Pacientes activos',
          value: pacientesActivos || 0,
          change: pacientesNuevos || 0,
          trend: 'up',
          icon: UsersIcon,
          color: 'primary',
          link: '/pacientes',
        },
        {
          label: 'Citas hoy',
          value: totalCitasHoy || 0,
          change: 0,
          trend: 'neutral',
          icon: CalendarDaysIcon,
          color: 'secondary',
          link: '/agenda',
        },
        {
          label: 'Ingresos del mes',
          value: `$${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
          change: deltaIngresos,
          trend: deltaIngresos >= 0 ? 'up' : 'down',
          icon: BanknotesIcon,
          color: 'success',
          link: '/facturacion',
        },
        {
          label: 'Pagos pendientes',
          value: pagosPendientes || 0,
          change: 0,
          trend: pagosPendientes && pagosPendientes > 5 ? 'down' : 'neutral',
          icon: ClipboardDocumentCheckIcon,
          color: 'warning',
          link: '/facturacion',
        },
      ])

      // Formatear citas de hoy
      if (citasData) {
        setCitasHoy(
          citasData.map((c: any) => ({
            id: c.id,
            hora: format(new Date(c.fecha_inicio), 'HH:mm'),
            paciente: `${c.paciente?.nombre} ${c.paciente?.apellidos}`,
            terapeuta: c.terapeuta?.nombre,
            estado: c.estado,
            tipo: c.tipo,
          }))
        )
      }

      // Alertas
      const alertasArr: AlertaDashboard[] = []
      if (pagosPendientes && pagosPendientes > 10) {
        alertasArr.push({
          tipo: 'warning',
          mensaje: `Tienes ${pagosPendientes} pagos pendientes por cobrar`,
          accion: 'Ver facturación',
          link: '/facturacion',
        })
      }
      setAlertas(alertasArr)

      const weekStart = startOfWeek(fechaHoy, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(fechaHoy, { weekStartsOn: 1 })
      const { data: citasSemana } = await supabase
        .from('citas')
        .select('fecha_inicio, estado')
        .eq('clinica_id', clinicaId)
        .gte('fecha_inicio', weekStart.toISOString())
        .lte('fecha_inicio', weekEnd.toISOString())

      const semanaChart: ChartCitas[] = []
      for (let i = 0; i < 6; i++) {
        const day = addDays(weekStart, i)
        const dayLabel = format(day, 'EEE', { locale: es })
        const dayStr = format(day, 'yyyy-MM-dd')
        const delDia = (citasSemana || []).filter(c =>
          format(new Date(c.fecha_inicio), 'yyyy-MM-dd') === dayStr
        )
        semanaChart.push({
          dia: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1, 3),
          citas: delDia.length,
          completadas: delDia.filter(c => c.estado === 'completada').length,
        })
      }
      setDataCitas(semanaChart)

      const { data: evals } = await supabase
        .from('evaluaciones')
        .select('tipo')
        .eq('clinica_id', clinicaId)

      const areasCount: Record<string, number> = {}
      for (const ev of evals || []) {
        areasCount[ev.tipo] = (areasCount[ev.tipo] || 0) + 1
      }
      setDataAreas(
        Object.entries(areasCount).map(([tipo, count]) => ({
          name: AREAS_LABEL[tipo] || tipo,
          value: count,
        }))
      )

      const hace14 = new Date(fechaHoy)
      hace14.setDate(hace14.getDate() - 14)
      const hace90 = new Date(fechaHoy)
      hace90.setDate(hace90.getDate() - 90)

      const { data: pacientesActivosList } = await supabase
        .from('pacientes')
        .select('id')
        .eq('clinica_id', clinicaId)
        .eq('activo', true)

      const { data: citasRecientes } = await supabase
        .from('citas')
        .select('paciente_id')
        .eq('clinica_id', clinicaId)
        .eq('estado', 'completada')
        .gte('fecha_inicio', hace14.toISOString())

      const { data: evalsRecientes } = await supabase
        .from('evaluaciones')
        .select('paciente_id')
        .eq('clinica_id', clinicaId)
        .gte('fecha', hace90.toISOString())

      const conCita = new Set((citasRecientes || []).map(c => c.paciente_id))
      const conEval = new Set((evalsRecientes || []).map(e => e.paciente_id))
      const sinCitaReciente = (pacientesActivosList || []).filter(p => !conCita.has(p.id)).length
      const sinEvalReciente = (pacientesActivosList || []).filter(p => !conEval.has(p.id)).length

      const inicioSemana = startOfWeek(fechaHoy, { weekStartsOn: 1 }).toISOString()
      const { count: sesionesSemana } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .gte('fecha', inicioSemana)

      const insightsArr: InsightDashboard[] = []
      if (sinCitaReciente > 0) {
        insightsArr.push({
          tipo: 'warning',
          titulo: 'Pacientes sin sesión reciente',
          mensaje: `${sinCitaReciente} paciente${sinCitaReciente > 1 ? 's' : ''} no ${sinCitaReciente > 1 ? 'tienen' : 'tiene'} cita completada en más de 2 semanas.`,
          link: '/agenda',
          linkLabel: 'Ver agenda',
        })
      }
      if (sinEvalReciente > 0) {
        insightsArr.push({
          tipo: 'info',
          titulo: 'Evaluaciones pendientes',
          mensaje: `${sinEvalReciente} paciente${sinEvalReciente > 1 ? 's' : ''} llevan más de 90 días sin evaluación de progreso.`,
          link: '/evaluaciones/pendientes',
          linkLabel: 'Programar evaluaciones',
        })
      }
      if ((sesionesSemana || 0) > 0) {
        insightsArr.push({
          tipo: 'success',
          titulo: 'Actividad de la semana',
          mensaje: `${sesionesSemana} sesión${(sesionesSemana || 0) > 1 ? 'es' : ''} registrada${(sesionesSemana || 0) > 1 ? 's' : ''} esta semana.`,
          link: '/sesiones',
          linkLabel: 'Ver sesiones',
        })
      }
      setInsights(insightsArr)

    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const estadoCitaColor: Record<string, string> = {
    programada: 'badge-neutral',
    confirmada: 'badge-primary',
    en_curso: 'badge-success',
    completada: 'badge-success',
    cancelada: 'badge-danger',
    no_asistio: 'badge-danger',
  }

  const estadoCitaLabel: Record<string, string> = {
    programada: 'Programada',
    confirmada: 'Confirmada',
    en_curso: 'En curso',
    completada: 'Completada',
    cancelada: 'Cancelada',
    no_asistio: 'No asistió',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-72 lg:col-span-2" />
          <div className="skeleton h-72" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Buenos días 👋
          </h1>
          <p className="page-subtitle">
            {format(fechaHoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pacientes/nuevo" className="btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Nuevo paciente
          </Link>
          <Link href="/agenda" className="btn-secondary btn-sm">
            <CalendarDaysIcon className="w-4 h-4" />
            Ver agenda
          </Link>
        </div>
      </div>

      {/* Alertas */}
      {alertas.map((alerta, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            alerta.tipo === 'danger'
              ? 'bg-danger-50 text-danger-700 border border-danger-200'
              : alerta.tipo === 'warning'
              ? 'bg-warning-50 text-warning-700 border border-warning-200'
              : 'bg-primary-50 text-primary-700 border border-primary-200'
          }`}
        >
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{alerta.mensaje}</span>
          {alerta.link && alerta.accion && (
            <Link href={alerta.link} className="underline underline-offset-2">
              {alerta.accion}
            </Link>
          )}
        </div>
      ))}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.link} className="stat-card group hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  kpi.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                  kpi.color === 'secondary' ? 'bg-secondary-100 text-secondary-600' :
                  kpi.color === 'success' ? 'bg-success-100 text-success-600' :
                  'bg-warning-100 text-warning-600'
                }`}
              >
                <kpi.icon className="w-5 h-5" />
              </div>
              {kpi.trend === 'up' && kpi.change !== 0 && (
                <span className="stat-change-up flex items-center gap-0.5">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  {kpi.label === 'Ingresos del mes' ? `${kpi.change > 0 ? '+' : ''}${kpi.change}%` : `+${kpi.change}`}
                </span>
              )}
              {kpi.trend === 'down' && kpi.change !== 0 && kpi.label === 'Ingresos del mes' && (
                <span className="stat-change-down flex items-center gap-0.5">
                  <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                  {kpi.change}%
                </span>
              )}
            </div>
            <p className="stat-value">{kpi.value}</p>
            <p className="stat-label">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de la semana */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Citas de la semana</h2>
              <p className="text-xs text-neutral-500">Programadas vs completadas</p>
            </div>
            <Link href="/reportes" className="btn-ghost btn-sm">Ver reportes</Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dataCitas.length ? dataCitas : [{ dia: '-', citas: 0, completadas: 0 }]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="citas" name="Programadas" stroke="#6366F1" strokeWidth={2} fill="url(#colorCitas)" dot={false} />
              <Area type="monotone" dataKey="completadas" name="Completadas" stroke="#22C55E" strokeWidth={2} fill="url(#colorComp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Áreas de intervención */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Áreas de intervención</h2>
            <p className="text-xs text-neutral-500">Evaluaciones por área</p>
          </div>
          {dataAreas.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400">Sin evaluaciones registradas</div>
          ) : (
            <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={dataAreas}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {dataAreas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(value, name) => [`${value} eval.`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {dataAreas.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-neutral-600">{item.name}</span>
                </div>
                <span className="font-medium text-neutral-800">{item.value}</span>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Citas de hoy + IA sugerencias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de hoy */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Citas de hoy</h2>
              <p className="text-xs text-neutral-500">
                {format(fechaHoy, "d 'de' MMMM", { locale: es })} · {citasHoy.length} programadas
              </p>
            </div>
            <Link href="/agenda" className="btn-secondary btn-sm">Ver agenda completa</Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {citasHoy.length === 0 ? (
              <div className="empty-state py-10">
                <CalendarDaysIcon className="empty-state-icon w-12 h-12" />
                <p className="empty-state-title">Sin citas programadas</p>
                <p className="empty-state-desc">No hay citas para hoy</p>
              </div>
            ) : (
              citasHoy.map((cita) => (
                <div key={cita.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <ClockIcon className="w-4 h-4 text-neutral-400 mb-0.5" />
                    <span className="text-xs font-semibold text-neutral-700">{cita.hora}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{cita.paciente}</p>
                    <p className="text-xs text-neutral-500 truncate">Terapeuta: {cita.terapeuta}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-400 capitalize">{cita.tipo}</span>
                    <span className={`badge ${estadoCitaColor[cita.estado] || 'badge-neutral'}`}>
                      {estadoCitaLabel[cita.estado] || cita.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sugerencias IA */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-secondary-100 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Asistente IA</h2>
              <p className="text-xs text-neutral-500">Insights de hoy</p>
            </div>
          </div>
          <div className="space-y-3">
            {insights.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-400">
                Sin alertas clínicas por ahora. ¡Buen trabajo!
              </div>
            ) : (
              insights.map((insight, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3.5 border ${
                    insight.tipo === 'warning'
                      ? 'bg-warning-50 border-warning-100'
                      : insight.tipo === 'success'
                      ? 'bg-success-50 border-success-100'
                      : 'bg-primary-50 border-primary-100'
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${
                    insight.tipo === 'warning'
                      ? 'text-warning-800'
                      : insight.tipo === 'success'
                      ? 'text-success-800'
                      : 'text-primary-800'
                  }`}>
                    {insight.titulo}
                  </p>
                  <p className={`text-xs ${
                    insight.tipo === 'warning'
                      ? 'text-warning-700'
                      : insight.tipo === 'success'
                      ? 'text-success-700'
                      : 'text-primary-700'
                  }`}>
                    {insight.mensaje}
                  </p>
                  {insight.link && insight.linkLabel && (
                    <Link
                      href={insight.link}
                      className={`text-xs font-medium mt-2 inline-block hover:underline ${
                        insight.tipo === 'warning'
                          ? 'text-warning-600'
                          : insight.tipo === 'success'
                          ? 'text-success-600'
                          : 'text-primary-600'
                      }`}
                    >
                      {insight.linkLabel} →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
          <Link href="/ia" className="btn-secondary btn-sm w-full mt-4 justify-center">
            <SparklesIcon className="w-4 h-4" />
            Ver análisis completo
          </Link>
        </div>
      </div>
    </div>
  )
}
