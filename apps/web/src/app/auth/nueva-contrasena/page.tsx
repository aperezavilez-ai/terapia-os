'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Logo from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'

export default function NuevaContrasenaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Contraseña actualizada')
      window.location.assign('/dashboard')
    } catch {
      toast.error('Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo iconSize="lg" showText={false} href={null} className="justify-center mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900">Nueva contraseña</h1>
          <p className="text-neutral-500 text-sm mt-1">Elige una contraseña segura</p>
        </div>

        <div className="card p-6 shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="btn-ghost w-full justify-center text-neutral-600"
            >
              Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
