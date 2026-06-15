'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  UsersIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'

const COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']

interface ReporteResumen {
  mes: string
  citas: number
  completadas: number
  nuevos_pacientes: number
  ingresos: number
  sesiones: number
}

interface ReporteTerapeuta {
  nombre: string
  citas: number
  completadas: number
  asistencia: number
  pacientes: number
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState('6')
  const [loading, setLoading] = useState(true)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [dataMensual, setDataMensual] = useState<ReporteResumen[]>([])
  const [dataTerapeutas, setDataTerapeutas] = useState<ReporteTerapeuta[]>([])
  const [dataAreas, setDataAreas] = useState<{ name: string; value: number }[]>([])
  const [statsResumen, setStatsResumen] = useState({
    totalPacientes: 0, pacientesActivos: 0, citasMes: 0, asistenciaMes: 0,
    ingresosMes: 0, sesionesTotal: 0,
  })
  const supabase = createClient()

  useEffect(() => { fetchReportes() }, [periodo])

  const fetchReportes = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: usuario } = await supabase.from('usuarios').select('clinica_id').eq('id', session.user.id).single()
      if (!usuario) return
      const cid = usuario.clinica_id

      const mesesAtras = parseInt(periodo)
      const fechaInicio = startOfMonth(subMonths(new Date(), mesesAtras - 1))
      const fechaFin = endOfMonth(new Date())
      const meses = eachMonthOfInterval({ start: fechaInicio, end: fechaFin })

      // Estadísticas generales
      const [totPac, actPac, totalSes] = await Promise.all([
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('clinica_id', cid),
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('clinica_id', cid).eq('activo', true),
        supabase.from('sesiones').select('*', { count: 'exact', head: true }).eq('clinica_id', cid),
      ])

      // Citas del mes actual
      const inicioMesActual = startOfMonth(new Date()).toISOString()
      const finMesActual = endOfMonth(new Date()).toISOString()
      const [citasMes, ingMes] = await Promise.all([
        supabase.from('citas').select('estado', { count: 'exact' }).eq('clinica_id', cid).gte('fecha_inicio', inicioMesActual).lte('fecha_inicio', finMesActual),
        supabase.from('facturacion').select('total').eq('clinica_id', cid).eq('estado', 'pagado').gte('fecha_pago', inicioMesActual),
      ])

      const totalCitasMes = citasMes.count || 0
      const completadasMes = citasMes.data?.filter(c => c.estado === 'completada').length || 0

      setStatsResumen({
        totalPacientes: totPac.count || 0,
        pacientesActivos: actPac.count || 0,
        citasMes: totalCitasMes,
        asistenciaMes: totalCitasMes > 0 ? Math.round((completadasMes / totalCitasMes) * 100) : 0,
        ingresosMes: (ingMes.data || []).reduce((s, f) => s + (f.total || 0), 0),
        sesionesTotal: totalSes.count || 0,
      })

      // Data mensual
      const monthlyData: ReporteResumen[] = []
      for (const mes of meses) {
        const ini = startOfMonth(mes).toISOString()
        const fin = endOfMonth(mes).toISOString()
        const [citas, pacs, ingresos] = await Promise.all([
          supabase.from('citas').select('estado', { count: 'exact' }).eq('clinica_id', cid).gte('fecha_inicio', ini).lte('fecha_inicio', fin),
          supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('clinica_id', cid).gte('created_at', ini).lte('created_at', fin),
          supabase.from('facturacion').select('total').eq('clinica_id', cid).eq('estado', 'pagado').gte('fecha_pago', ini).lte('fecha_pago', fin),
        ])

        const completadas = citas.data?.filter(c => c.estado === 'completada').length || 0
        const ingTotal = (ingresos.data || []).reduce((s, f) => s + (f.total || 0), 0)
        monthlyData.push({
          mes: format(mes, 'MMM', { locale: es }),
          citas: citas.count || 0,
          completadas,
          nuevos_pacientes: pacs.count || 0,
          ingresos: ingTotal,
          sesiones: completadas,
        })
      }
      setDataMensual(monthlyData)

      // Terapeutas
      const { data: terapeutas } = await supabase
        .from('usuarios')
        .select('id, nombre, apellidos')
        .eq('clinica_id', cid)
        .in('rol', ['terapeuta', 'director_clinico'])
      
      const terapData: ReporteTerapeuta[] = []
      for (const t of terapeutas || []) {
        const { data: citasTer, count: totalCitasTer } = await supabase
          .from('citas')
          .select('estado, paciente_id', { count: 'exact' })
          .eq('terapeuta_id', t.id)
          .gte('fecha_inicio', fechaInicio.toISOString())
        const comp = citasTer?.filter(c => c.estado === 'completada').length || 0
        const pacUnico = new Set(citasTer?.map(c => c.paciente_id)).size
        if (totalCitasTer && totalCitasTer > 0) {
          terapData.push({
            nombre: t.nombre,
            citas: totalCitasTer,
            completadas: comp,
            asistencia: Math.round((comp / totalCitasTer) * 100),
            pacientes: pacUnico,
          })
        }
      }
      setDataTerapeutas(terapData)

      // Áreas de evaluación
      const { data: evals } = await supabase.from('evaluaciones').select('tipo').eq('clinica_id', cid)
      const areasCount: Record<string, number> = {}
      for (const ev of evals || []) {
        areasCount[ev.tipo] = (areasCount[ev.tipo] || 0) + 1
      }
      const areasLabel: Record<string, string> = {
        motricidad_fina: 'M. Fina',
        motricidad_gruesa: 'M. Gruesa',
        integracion_sensorial: 'Sensorial',
        atencion: 'Atención',
        conducta: 'Conducta',
        cognitivo: 'Cognitivo',
      }
      setDataAreas(Object.entries(areasCount).map(([tipo, count]) => ({
        name: areasLabel[tipo] || tipo,
        value: count,
      })))

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = async () => {
    setGenerandoPDF(true)
    try {
      const response = await fetch('/api/reportes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ejecutivo',
          periodo: parseInt(periodo),
          data: { statsResumen, dataMensual, dataTerapeutas },
        }),
      })
      if (!response.ok) throw new Error('Error generando PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      a.click()
    } catch {
      // PDF generation via browser
      window.print()
    } finally {
      setGenerandoPDF(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Análisis ejecutivo de productividad y rendimiento</p>
        </div>
        <div className="flex gap-2">
          <select
            className="input w-auto py-2 text-sm"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
          >
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último año</option>
          </select>
          <button onClick={descargarPDF} disabled={generandoPDF} className="btn-primary">
            {generandoPDF ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Pacientes totales', value: statsResumen.totalPacientes, icon: UsersIcon, color: 'primary' },
          { label: 'Pacientes activos', value: statsResumen.pacientesActivos, icon: UsersIcon, color: 'success' },
          { label: 'Citas este mes', value: statsResumen.citasMes, icon: CalendarDaysIcon, color: 'secondary' },
          { label: 'Asistencia', value: `${statsResumen.asistenciaMes}%`, icon: ClipboardDocumentListIcon, color: 'warning' },
          { label: 'Ingresos mes', value: `$${(statsResumen.ingresosMes / 1000).toFixed(1)}k`, icon: BanknotesIcon, color: 'success' },
          { label: 'Sesiones totales', value: statsResumen.sesionesTotal, icon: ChartBarIcon, color: 'primary' },
        ].map((kpi, i) => (
          <div key={i} className="stat-card">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
              kpi.color === 'primary' ? 'bg-primary-100 text-primary-600' :
              kpi.color === 'secondary' ? 'bg-secondary-100 text-secondary-600' :
              kpi.color === 'success' ? 'bg-success-100 text-success-600' :
              'bg-warning-100 text-warning-600'
            }`}>
              <kpi.icon className="w-3.5 h-3.5" />
            </div>
            <p className="stat-value text-lg">{kpi.value}</p>
            <p className="stat-label">{kpi.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Tendencias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Citas por mes */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Citas por mes</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dataMensual} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="gcitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gcomp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="citas" name="Programadas" stroke="#6366F1" strokeWidth={2} fill="url(#gcitas)" />
                  <Area type="monotone" dataKey="completadas" name="Completadas" stroke="#22C55E" strokeWidth={2} fill="url(#gcomp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Ingresos por mes */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Ingresos mensuales</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataMensual} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ingresos']}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pacientes nuevos */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Nuevos pacientes por mes</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dataMensual} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="nuevos_pacientes" name="Pacientes nuevos" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución por área */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">Evaluaciones por área</h2>
              {dataAreas.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">Sin evaluaciones registradas</div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={dataAreas} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {dataAreas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {dataAreas.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-neutral-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de terapeutas */}
          {dataTerapeutas.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-900">Productividad por terapeuta</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Últimos {periodo} meses</p>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Terapeuta</th>
                      <th>Citas programadas</th>
                      <th>Completadas</th>
                      <th>% Asistencia</th>
                      <th>Pacientes activos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataTerapeutas.map((t, i) => (
                      <tr key={i}>
                        <td className="font-medium text-neutral-900">{t.nombre}</td>
                        <td>{t.citas}</td>
                        <td className="text-success-600 font-medium">{t.completadas}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar w-16">
                              <div className="progress-fill bg-primary-500" style={{ width: `${t.asistencia}%` }} />
                            </div>
                            <span className={t.asistencia >= 80 ? 'text-success-600 font-medium' : 'text-warning-600 font-medium'}>
                              {t.asistencia}%
                            </span>
                          </div>
                        </td>
                        <td>{t.pacientes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
