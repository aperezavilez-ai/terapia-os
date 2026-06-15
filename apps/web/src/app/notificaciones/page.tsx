'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  BellIcon, CalendarDaysIcon, BanknotesIcon,
  ChatBubbleLeftRightIcon, Cog6ToothIcon, SparklesIcon,
  CheckIcon, TrashIcon,
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Notificacion } from '@/types'

const TIPO_ICON: Record<string, any> = {
  cita: CalendarDaysIcon,
  mensaje: ChatBubbleLeftRightIcon,
  pago: BanknotesIcon,
  sistema: Cog6ToothIcon,
  ia: SparklesIcon,
}

const TIPO_COLOR: Record<string, string> = {
  cita: 'bg-primary-100 text-primary-600',
  mensaje: 'bg-success-100 text-success-600',
  pago: 'bg-warning-100 text-warning-600',
  sistema: 'bg-neutral-100 text-neutral-600',
  ia: 'bg-secondary-100 text-secondary-600',
}

function formatFecha(fecha: string) {
  const d = new Date(fecha)
  if (isToday(d)) return `Hoy, ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Ayer, ${format(d, 'HH:mm')}`
  return format(d, "d 'de' MMMM, HH:mm", { locale: es })
}

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotificaciones((data || []) as Notificacion[])
    setLoading(false)

    // Marcar como leídas
    await supabase
      .from('notificaciones')
      .update({ leida: true, leida_at: new Date().toISOString() })
      .eq('usuario_id', session.user.id)
      .eq('leida', false)
  }

  const marcarTodas = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', session.user.id)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    toast.success('Todas marcadas como leídas')
  }

  const eliminar = async (id: string) => {
    await supabase.from('notificaciones').delete().eq('id', id)
    setNotificaciones(prev => prev.filter(n => n.id !== id))
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-subtitle">
            {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al día'}
          </p>
        </div>
        {noLeidas > 0 && (
          <button onClick={marcarTodas} className="btn-secondary btn-sm">
            <CheckIcon className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-neutral-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="empty-state py-16">
            <BellIcon className="empty-state-icon w-12 h-12" />
            <p className="empty-state-title">Sin notificaciones</p>
            <p className="empty-state-desc">Aquí aparecerán las notificaciones del sistema</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notificaciones.map(n => {
              const Icon = TIPO_ICON[n.tipo] || BellIcon
              const colorClass = TIPO_COLOR[n.tipo] || 'bg-neutral-100 text-neutral-600'
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors ${!n.leida ? 'bg-primary-50/30' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${!n.leida ? 'text-neutral-900' : 'text-neutral-700'}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                        <p className="text-2xs text-neutral-400 mt-1">{formatFecha(n.created_at)}</p>
                      </div>
                      {!n.leida && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    {n.url_accion && (
                      <Link href={n.url_accion} className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                        Ver detalle →
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => eliminar(n.id)}
                    className="btn-icon text-neutral-300 hover:text-neutral-500 shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
