import { createClient as createAdminClient, type User } from '@supabase/supabase-js'
import { createClient, createClientFromRequest } from '@/lib/supabase/server'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function resolveUser(request?: Request): Promise<User | null> {
  const authHeader = request?.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await admin().auth.getUser(token)
    if (!error && user) return user
  }

  if (request) {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) return user
  }

  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getPortalSession(request?: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  const user = await resolveUser(request)
  if (!user) return null

  const adminClient = admin()
  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('id, rol, activo, nombre, apellidos, email, telefono')
    .eq('id', user.id)
    .maybeSingle()

  if (usuarioError || !usuario || usuario.rol !== 'padre' || !usuario.activo) return null

  const { data: familiar, error: familiarError } = await adminClient
    .from('familiares')
    .select(`
      id,
      nombre,
      apellidos,
      tipo_relacion,
      email,
      paciente_id,
      paciente:pacientes(
        id,
        nombre,
        apellidos,
        foto_url,
        clinica_id,
        motivo_consulta,
        diagnosticos
      )
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (familiarError || !familiar) return null

  return { user, usuario, familiar }
}
