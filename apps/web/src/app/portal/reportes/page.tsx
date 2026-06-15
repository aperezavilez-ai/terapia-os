'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { portalFetch } from '@/lib/portal-fetch'

const TIPO_LABEL: Record<string, string> = {
  semanal: 'Reporte semanal',
  mensual: 'Reporte mensual',
  trimestral: 'Reporte trimestral',
  progreso: 'Reporte de progreso',
  expediente: 'Expediente',
}

export default function PortalReportesPage() {
  const [reportes, setReportes] = useState<any[]>([])
  const [archivos, setArchivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const res = await portalFetch('/api/portal/reportes')
    if (res.status === 401) { router.push('/auth/login'); return }
    const data = await res.json()
    setReportes(data.reportes || [])
    setArchivos(data.archivos || [])
    setLoading(false)
  }

  return (
    <>
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-neutral-100 rounded w-2/3 mb-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-neutral-800 mb-3">Reportes del terapeuta</h2>
            {reportes.length === 0 ? (
              <div className="card p-8 text-center">
                <SparklesIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-neutral-600">Sin reportes compartidos aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportes.map(rep => (
                  <div key={rep.id} className="card overflow-hidden">
                    <button
                      onClick={() => setAbierto(abierto === rep.id ? null : rep.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                          <SparklesIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            {rep.titulo || TIPO_LABEL[rep.tipo] || rep.tipo}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {format(new Date(rep.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                      {abierto === rep.id ? (
                        <ChevronUpIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                    </button>
                    {abierto === rep.id && (
                      <div className="px-4 pb-4 border-t border-neutral-100">
                        <div className="pt-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                          {rep.contenido}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {archivos.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-neutral-800 mb-3">Documentos</h2>
              <div className="card divide-y divide-neutral-100">
                {archivos.map(arch => (
                  <a
                    key={arch.id}
                    href={arch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-neutral-50 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 text-primary-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{arch.nombre}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
