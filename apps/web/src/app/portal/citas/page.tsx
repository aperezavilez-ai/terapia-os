'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDaysIcon,
  BellIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { format, isAfter, isBefore, addHours } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { portalFetch } from '@/lib/portal-fetch'

export default function PortalCitasPage() {
  const [citas, setCitas] = useState<any[]>([])
  const [paciente, setPaciente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const meRes = await portalFetch('/api/portal/me')
      if (meRes.status === 401) { router.push('/auth/login'); return }
      if (!meRes.ok) throw new Error('Error al cargar perfil')
      const me = await meRes.json()
      if (!me.familiar?.paciente) {
        toast.error('No se encontró tu perfil de familiar. Contacta a la clínica.')
        return
      }
      setPaciente(me.familiar.paciente)

      const citasRes = await portalFetch('/api/portal/citas')
      if (!citasRes.ok) throw new Error('Error al cargar citas')
      const { citas: citasData } = await citasRes.json()
      setCitas(citasData || [])
    } catch {
      toast.error('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  const confirmarCita = async (citaId: string) => {
    try {
      const res = await portalFetch('/api/portal/citas', {
        method: 'PATCH',
        body: JSON.stringify({ citaId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Cita confirmada')
      fetchData()
    } catch {
      toast.error('Error al confirmar')
    }
  }

  const ahora = new Date()
  const citasProximas = citas.filter(c => isAfter(new Date(c.fecha_inicio), ahora) && c.estado !== 'cancelada')
  const citasPasadas = citas.filter(c => isBefore(new Date(c.fecha_inicio), ahora) || c.estado === 'cancelada').slice(0, 5)

  const estadoColor: Record<string, string> = {
    programada: 'badge-warning',
    confirmada: 'badge-success',
    completada: 'badge-primary',
    cancelada: 'badge-neutral',
  }
  const estadoLabel: Record<string, string> = {
    programada: 'Pendiente confirmar',
    confirmada: 'Confirmada',
    completada: 'Completada',
    cancelada: 'Cancelada',
  }

  return (
    <>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-neutral-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-neutral-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {paciente && (
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600 shrink-0">
                {paciente.nombre[0]}
              </div>
              <div>
                <p className="font-bold text-neutral-900">{paciente.nombre} {paciente.apellidos}</p>
                {(paciente.motivo_consulta || paciente.diagnosticos?.[0]) && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {paciente.motivo_consulta || paciente.diagnosticos?.[0]}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-neutral-800 mb-3">Próximas citas</h2>
            {citasProximas.length === 0 ? (
              <div className="card p-6 text-center">
                <CalendarDaysIcon className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Sin citas próximas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {citasProximas.map(cita => {
                  const esPronto = isBefore(new Date(cita.fecha_inicio), addHours(ahora, 48))
                  const necesitaConfirmar = cita.estado === 'programada' && !cita.confirmada_por_padre

                  return (
                    <div key={cita.id} className={`card p-4 ${esPronto ? 'border-primary-200 bg-primary-50/30' : ''}`}>
                      {esPronto && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <BellIcon className="w-3.5 h-3.5 text-primary-500" />
                          <p className="text-xs font-semibold text-primary-600">Próximamente</p>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900 text-sm">
                            {format(new Date(cita.fecha_inicio), "EEEE d 'de' MMMM", { locale: es })}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {format(new Date(cita.fecha_inicio), 'HH:mm')}
                            </span>
                            {cita.sala && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="w-3.5 h-3.5" />
                                {cita.sala}
                              </span>
                            )}
                          </div>
                          {cita.terapeuta && (
                            <p className="text-xs text-neutral-500 mt-1">
                              {cita.terapeuta.nombre} {cita.terapeuta.apellidos}
                            </p>
                          )}
                        </div>
                        <span className={`badge shrink-0 ${estadoColor[cita.estado] || 'badge-neutral'}`}>
                          {estadoLabel[cita.estado] || cita.estado}
                        </span>
                      </div>
                      {necesitaConfirmar && (
                        <button
                          onClick={() => confirmarCita(cita.id)}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Confirmar asistencia
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {citasPasadas.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-neutral-800 mb-3">Historial reciente</h2>
              <div className="card overflow-hidden divide-y divide-neutral-100">
                {citasPasadas.map(cita => (
                  <div key={cita.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 bg-neutral-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <p className="text-xs font-bold text-neutral-700">{format(new Date(cita.fecha_inicio), 'd')}</p>
                      <p className="text-2xs text-neutral-400 uppercase">{format(new Date(cita.fecha_inicio), 'MMM', { locale: es })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-800 font-medium">
                        {format(new Date(cita.fecha_inicio), 'HH:mm')}
                        {cita.terapeuta && ` · ${cita.terapeuta.nombre}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
