'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Logo from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage, normalizeEmail } from '@/lib/auth'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState<'login' | 'reset'>('login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailNorm = normalizeEmail(email)
    if (!emailNorm || !password) {
      toast.error('Ingresa tu email y contraseña')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      })

      if (error) {
        toast.error(authErrorMessage(error.message))
        return
      }

      if (!data.session) {
        toast.error('No se pudo iniciar sesión. Intenta de nuevo.')
        return
      }

      const { data: usuario, error: profileError } = await supabase
        .from('usuarios')
        .select('id, activo, rol')
        .eq('id', data.session.user.id)
        .maybeSingle()

      if (profileError || !usuario) {
        await supabase.auth.signOut()
        toast.error('Tu cuenta no está configurada. Contacta al administrador.')
        return
      }

      if (!usuario.activo) {
        await supabase.auth.signOut()
        toast.error('Tu cuenta está desactivada.')
        return
      }

      toast.success('Bienvenido de vuelta')
      const defaultPath = usuario.rol === 'padre' ? '/portal/citas' : '/dashboard'
      const nextParam = searchParams.get('next')
      const next = nextParam && nextParam.startsWith('/') ? nextParam : defaultPath
      window.location.assign(usuario.rol === 'padre' && nextParam?.startsWith('/dashboard') ? defaultPath : next)
    } catch {
      toast.error('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailNorm = normalizeEmail(email)
    if (!emailNorm) {
      toast.error('Ingresa tu email')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
        redirectTo: `${appUrl}/auth/callback?next=/auth/nueva-contrasena`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Te enviamos un correo para restablecer tu contraseña')
      setModo('login')
    } catch {
      toast.error('Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo iconSize="lg" showText={false} href={null} className="justify-center mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900">Aprendamos Juntos</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {modo === 'login' ? 'Inicia sesión en tu cuenta' : 'Restablece tu contraseña'}
          </p>
          {modo === 'login' && (
            <p className="text-xs text-neutral-400 mt-2">
              Padres y tutores: usen el correo y contraseña que les entregó la clínica
            </p>
          )}
        </div>

        <div className="card p-6 shadow-modal">
          {searchParams.get('error') === 'callback' && (
            <p className="mb-4 text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
              El enlace expiró o no es válido. Intenta iniciar sesión de nuevo.
            </p>
          )}

          {modo === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setModo('reset')}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center mt-2"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="label">Email de tu cuenta</label>
                <input
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
              </button>
              <button
                type="button"
                onClick={() => setModo('login')}
                className="btn-ghost w-full justify-center text-neutral-600"
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Aprendamos Juntos © {new Date().getFullYear()} · Sistema de gestión clínica
        </p>
      </div>
    </div>
  )
}
