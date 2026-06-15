'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/brand/Logo'

const NAV = [
  { href: '/portal/citas', label: 'Citas', icon: CalendarDaysIcon },
  { href: '/portal/reportes', label: 'Reportes', icon: DocumentTextIcon },
  { href: '/portal/mensajes', label: 'Mensajes', icon: ChatBubbleLeftRightIcon },
  { href: '/portal/perfil', label: 'Perfil', icon: UserCircleIcon },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/auth/login')
  }

  const navigate = (href: string) => {
    if (pathname !== href) router.push(href)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-4 pt-8 pb-6 shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <Logo href="/portal/citas" showText={false} iconSize="sm" className="mb-2" />
            <p className="text-primary-100 text-xs font-medium">Portal Familias</p>
            <h1 className="text-lg font-bold mt-0.5">Aprendamos Juntos</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            title="Cerrar sesión"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 -mt-4 pt-4 pb-28">
        {children}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 flex z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors touch-manipulation ${
                isActive ? 'text-primary-600' : 'text-neutral-400 active:text-neutral-700'
              }`}
            >
              <item.icon className="w-5 h-5 pointer-events-none" />
              <span className="pointer-events-none">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
