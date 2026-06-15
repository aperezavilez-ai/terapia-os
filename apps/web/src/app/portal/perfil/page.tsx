'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { portalFetch } from '@/lib/portal-fetch'

const RELACION_LABEL: Record<string, string> = {
  padre: 'Padre',
  madre: 'Madre',
  tutor: 'Tutor legal',
  emergencia: 'Contacto de emergencia',
}

export default function PortalPerfilPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    portalFetch('/api/portal/me')
      .then(r => {
        if (r.status === 401) { router.push('/auth/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d); setLoading(false) })
  }, [router])

  return (
    <>
      {loading ? (
        <div className="card p-6 animate-pulse">
          <div className="h-4 bg-neutral-100 rounded w-1/2 mb-3" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-neutral-800 mb-4">Tu cuenta</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Nombre</dt>
                <dd className="font-medium text-neutral-900">
                  {data?.usuario?.nombre} {data?.usuario?.apellidos}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="font-medium text-neutral-900">{data?.usuario?.email}</dd>
              </div>
              {data?.familiar && (
                <div>
                  <dt className="text-neutral-500">Relación</dt>
                  <dd className="font-medium text-neutral-900">
                    {RELACION_LABEL[data.familiar.tipo_relacion] || data.familiar.tipo_relacion}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {data?.familiar?.paciente && (
            <div className="card p-5">
              <h2 className="text-sm font-bold text-neutral-800 mb-4">Paciente vinculado</h2>
              <p className="font-semibold text-neutral-900">
                {data.familiar.paciente.nombre} {data.familiar.paciente.apellidos}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
