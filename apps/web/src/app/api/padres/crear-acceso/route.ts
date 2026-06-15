import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarPassword(longitud = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#'
  let pwd = ''
  for (let i = 0; i < longitud; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: staff } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', session.user.id)
      .single()

    if (!staff || staff.rol === 'padre') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { email, nombre, apellidos, familiar_id, paciente_id, password: customPassword } = body

    if (!email || !nombre || !familiar_id || !paciente_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const password = customPassword || generarPassword()
    const admin = adminClient()

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellidos: apellidos || '' },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Ese correo ya tiene una cuenta registrada' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    await admin.from('usuarios').insert({
      id: authUser.user.id,
      clinica_id: staff.clinica_id,
      nombre: nombre.trim(),
      apellidos: (apellidos || '').trim(),
      email: emailNorm,
      rol: 'padre',
      activo: true,
    })

    await admin.from('familiares').update({
      auth_user_id: authUser.user.id,
      tiene_acceso_portal: true,
      email: emailNorm,
    }).eq('id', familiar_id).eq('paciente_id', paciente_id)

    return NextResponse.json({
      ok: true,
      email: emailNorm,
      password,
      user_id: authUser.user.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
