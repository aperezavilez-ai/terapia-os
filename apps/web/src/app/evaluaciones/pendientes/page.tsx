'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ClipboardDocumentListIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface PacientePendiente {
  id: string
  nombre: string
  apellidos: string
  ultimaEvaluacion: string | null
  diasSinEval: number
}

export default function EvaluacionesPendientesPage() {
  const [pacientes, setPacientes] = useState<PacientePendiente[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPendientes()
  }, [])

  const fetchPendientes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      const hace90 = new Date()
      hace90.setDate(hace90.getDate() - 90)

      const { data: activos } = await supabase
        .from('pacientes')
        .select('id, nombre, apellidos')
        .eq('clinica_id', usuario.clinica_id)
        .eq('activo', true)
        .order('nombre')

      const { data: evals } = await supabase
        .from('evaluaciones')
        .select('paciente_id, fecha')
        .eq('clinica_id', usuario.clinica_id)
        .order('fecha', { ascending: false })

      const ultimaPorPaciente = new Map<string, string>()
      for (const ev of evals || []) {
        if (!ultimaPorPaciente.has(ev.paciente_id)) {
          ultimaPorPaciente.set(ev.paciente_id, ev.fecha)
        }
      }

      const pendientes: PacientePendiente[] = []
      for (const p of activos || []) {
        const ultima = ultimaPorPaciente.get(p.id) || null
        const diasSinEval = ultima
          ? differenceInDays(new Date(), new Date(ultima))
          : 999
        if (!ultima || new Date(ultima) < hace90) {
          pendientes.push({
            id: p.id,
            nombre: p.nombre,
            apellidos: p.apellidos,
            ultimaEvaluacion: ultima,
            diasSinEval: ultima ? diasSinEval : -1,
          })
        }
      }

      pendientes.sort((a, b) => b.diasSinEval - a.diasSinEval)
      setPacientes(pendientes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluaciones pendientes</h1>
          <p className="page-subtitle">
            Pacientes activos sin evaluación de progreso en los últimos 90 días
          </p>
        </div>
        <Link href="/evaluaciones/nueva" className="btn-primary btn-sm">
          <PlusIcon className="w-4 h-4" />
          Nueva evaluación
        </Link>
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full rounded-2xl" />
      ) : pacientes.length === 0 ? (
        <div className="card empty-state py-16">
          <ClipboardDocumentListIcon className="empty-state-icon w-12 h-12" />
          <p className="empty-state-title">¡Al día!</p>
          <p className="empty-state-desc">Todos los pacientes activos tienen evaluación reciente</p>
        </div>
      ) : (
        <div className="card divide-y divide-neutral-100">
          {pacientes.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {p.nombre} {p.apellidos}
                </p>
                <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {p.ultimaEvaluacion
                    ? `Última evaluación: ${format(new Date(p.ultimaEvaluacion), "d MMM yyyy", { locale: es })} (${p.diasSinEval} días)`
                    : 'Sin evaluaciones registradas'}
                </p>
              </div>
              <Link
                href={`/evaluaciones/nueva?paciente=${p.id}`}
                className="btn-primary btn-sm shrink-0"
              >
                Evaluar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
