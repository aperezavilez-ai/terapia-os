'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ChevronDownIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import type { Usuario } from '@/types'
import Logo from '@/components/brand/Logo'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/pacientes', label: 'Pacientes', icon: UsersIcon, badge: null },
  { href: '/agenda', label: 'Agenda', icon: CalendarDaysIcon },
  { href: '/evaluaciones', label: 'Evaluaciones', icon: ClipboardDocumentListIcon },
  { href: '/planes', label: 'Planes terapéuticos', icon: DocumentTextIcon },
  { href: '/sesiones', label: 'Sesiones', icon: ClipboardDocumentListIcon },
  { href: '/ia', label: 'IA Clínica', icon: SparklesIcon, highlight: true },
  { href: '/reportes', label: 'Reportes', icon: ChartBarIcon },
  { href: '/facturacion', label: 'Facturación', icon: BanknotesIcon },
  { href: '/mensajes', label: 'Mensajes', icon: ChatBubbleLeftRightIcon },
]

const adminNavItems = [
  { href: '/configuracion?tab=sucursales', label: 'Sucursales', icon: BuildingOffice2Icon },
  { href: '/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<Usuario | null>(null)
  const [clinicaNombre, setClinicaNombre] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*, clinica:clinicas(nombre)')
        .eq('id', session.user.id)
        .single()

      if (usuario) {
        setUser(usuario as Usuario)
        setClinicaNombre((usuario as any).clinica?.nombre || 'Mi Clínica')
      }

      // Notificaciones no leídas
      const { count } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', session.user.id)
        .eq('leida', false)

      setNotifCount(count || 0)
    }

    fetchUser()
  }, [supabase, router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/auth/login')
  }

  const userInitials = user
    ? `${user.nombre[0]}${user.apellidos?.[0] || ''}`.toUpperCase()
    : '?'

  const getRolLabel = (rol?: string) => {
    const labels: Record<string, string> = {
      admin_general: 'Administrador',
      director_clinico: 'Director Clínico',
      recepcion: 'Recepción',
      terapeuta: 'Terapeuta',
      padre: 'Padre/Tutor',
    }
    return rol ? labels[rol] || rol : ''
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-neutral-100">
        <Logo href="/dashboard" subtitle={clinicaNombre} iconSize="sm" />
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide space-y-0.5">
        <p className="px-3 mb-2 text-2xs font-semibold text-neutral-400 uppercase tracking-widest">
          Principal
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                isActive ? 'sidebar-item-active' : 'sidebar-item',
                item.highlight && !isActive && 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700'
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto badge badge-primary text-2xs">IA</span>
              )}
            </Link>
          )
        })}

        {/* Admin items */}
        {user?.rol && ['admin_general', 'director_clinico'].includes(user.rol) && (
          <>
            <p className="px-3 mt-4 mb-2 text-2xs font-semibold text-neutral-400 uppercase tracking-widest">
              Administración
            </p>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={isActive ? 'sidebar-item-active' : 'sidebar-item'}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-3 border-t border-neutral-100 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
          <div className="avatar-sm text-xs" style={{ background: 'var(--color-primary)' }}>
            {user?.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.foto_url}
                alt={user.nombre}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="avatar avatar-sm">{userInitials}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {user?.nombre} {user?.apellidos}
            </p>
            <p className="text-xs text-neutral-500 truncate">{getRolLabel(user?.rol)}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-neutral-400 hover:text-danger-600 transition-colors p-1"
            title="Cerrar sesión"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>

        {user?.rol && user.rol !== 'padre' && (
          <Link
            href="/configuracion?tab=usuarios&nuevo=1"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            <UserPlusIcon className="w-3.5 h-3.5 shrink-0" />
            Agregar usuario
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-neutral-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* SIDEBAR MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 bg-white shadow-modal animate-slide-in-right">
            <button
              className="absolute top-4 right-4 btn-icon text-neutral-500"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          {/* Botón hamburger mobile */}
          <button
            className="lg:hidden btn-icon text-neutral-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          {/* Búsqueda */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                placeholder="Buscar paciente, cita..."
                className="input pl-9 py-2 text-sm h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notificaciones */}
            <Link href="/notificaciones" className="btn-icon relative text-neutral-600">
              <BellIcon className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-2xs rounded-full flex items-center justify-center font-bold">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
