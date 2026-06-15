'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Paciente } from '@/types'

const filtrosEstado = [
  { value: 'todos', label: 'Todos' },
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'nuevos', label: 'Nuevos este mes' },
]

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [paginaActual, setPaginaActual] = useState(1)
  const POR_PAGINA = 20
  const supabase = createClient()

  const fetchPacientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('clinica_id, sucursal_id, rol')
        .eq('id', session.user.id)
        .single()
      if (!usuario) return

      let query = supabase
        .from('pacientes')
        .select(`
          *,
          terapeuta_asignado:usuarios(nombre, apellidos, foto_url),
          sucursal:sucursales(nombre)
        `, { count: 'exact' })
        .eq('clinica_id', usuario.clinica_id)
        .order('nombre')
        .range((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA - 1)

      // Filtros
      if (filtroEstado === 'activos') query = query.eq('activo', true)
      if (filtroEstado === 'inactivos') query = query.eq('activo', false)
      if (filtroEstado === 'nuevos') {
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        query = query.gte('created_at', inicioMes)
      }

      // Búsqueda
      if (busqueda.trim()) {
        query = query.ilike('nombre', `%${busqueda}%`)
      }

      // Terapeuta solo ve sus pacientes
      if (usuario.rol === 'terapeuta') {
        query = query.eq('terapeuta_asignado_id', session.user.id)
      }

      const { data, count, error } = await query
      if (error) throw error

      setPacientes((data as unknown as Paciente[]) || [])
      setTotalPacientes(count || 0)
    } catch (err) {
      console.error('Error fetching pacientes:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, busqueda, filtroEstado, paginaActual])

  useEffect(() => {
    const timer = setTimeout(fetchPacientes, busqueda ? 400 : 0)
    return () => clearTimeout(timer)
  }, [fetchPacientes, busqueda])

  const calcularEdad = (fechaNacimiento: string) => {
    return differenceInYears(new Date(), new Date(fechaNacimiento))
  }

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre[0]}${apellidos?.[0] || ''}`.toUpperCase()
  }

  const totalPaginas = Math.ceil(totalPacientes / POR_PAGINA)

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">{totalPacientes} pacientes registrados</p>
        </div>
        <Link href="/pacientes/nuevo" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Nuevo paciente
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            placeholder="Buscar por nombre, CURP, escuela..."
            className="input pl-9"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
          />
        </div>
        <div className="flex gap-2">
          {filtrosEstado.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFiltroEstado(f.value); setPaginaActual(1) }}
              className={`btn btn-sm ${filtroEstado === f.value ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de pacientes */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 last:border-b-0">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-40" />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-16" />
              </div>
            ))}
          </div>
        ) : pacientes.length === 0 ? (
          <div className="empty-state py-16">
            <UserIcon className="empty-state-icon" />
            <p className="empty-state-title">No se encontraron pacientes</p>
            <p className="empty-state-desc">
              {busqueda
                ? `No hay coincidencias para "${busqueda}"`
                : 'Registra tu primer paciente para comenzar'}
            </p>
            <Link href="/pacientes/nuevo" className="btn-primary btn-sm mt-4">
              <PlusIcon className="w-4 h-4" />
              Nuevo paciente
            </Link>
          </div>
        ) : (
          <>
            {/* Header tabla */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              <div className="col-span-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Paciente</div>
              <div className="col-span-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Edad</div>
              <div className="col-span-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Terapeuta</div>
              <div className="col-span-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Estado</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-neutral-100">
              {pacientes.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors items-center"
                >
                  {/* Paciente */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="shrink-0">
                      {p.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.foto_url}
                          alt={p.nombre}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="avatar avatar-sm text-xs shrink-0">
                          {getInitials(p.nombre, p.apellidos)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="text-sm font-medium text-neutral-900 hover:text-primary-600 transition-colors truncate block"
                      >
                        {p.nombre} {p.apellidos}
                      </Link>
                      <p className="text-xs text-neutral-500 truncate">
                        {p.escuela || 'Sin escuela registrada'}
                      </p>
                    </div>
                  </div>

                  {/* Edad */}
                  <div className="col-span-2">
                    <p className="text-sm text-neutral-700 font-medium">
                      {calcularEdad(p.fecha_nacimiento)} años
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(p.fecha_nacimiento), 'd MMM yyyy', { locale: es })}
                    </p>
                  </div>

                  {/* Terapeuta */}
                  <div className="col-span-3">
                    {(p as any).terapeuta_asignado ? (
                      <div className="flex items-center gap-2">
                        <div className="avatar w-6 h-6 text-2xs shrink-0">
                          {(p as any).terapeuta_asignado.nombre[0]}
                        </div>
                        <span className="text-sm text-neutral-700 truncate">
                          {(p as any).terapeuta_asignado.nombre}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Sin asignar</span>
                    )}
                  </div>

                  {/* Estado */}
                  <div className="col-span-2">
                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-neutral'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="col-span-1 flex justify-end">
                    <div className="relative group">
                      <button className="btn-icon btn-ghost text-neutral-400">
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-modal border border-neutral-200 py-1 z-10 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                        <Link
                          href={`/pacientes/${p.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Ver expediente
                        </Link>
                        <Link
                          href={`/pacientes/${p.id}/editar`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/agenda?paciente=${p.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Agendar cita
                        </Link>
                        <div className="divider my-1" />
                        <button className="flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 w-full">
                          <ArchiveBoxIcon className="w-4 h-4" />
                          Dar de baja
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-500">
                  Mostrando {(paginaActual - 1) * POR_PAGINA + 1}-{Math.min(paginaActual * POR_PAGINA, totalPacientes)} de {totalPacientes}
                </p>
                <div className="flex gap-1.5">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual(p => p - 1)}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual(p => p + 1)}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
