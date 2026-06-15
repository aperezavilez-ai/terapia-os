import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getPortalSession } from '@/lib/portal-auth'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: Request) {
  const ctx = await getPortalSession(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: citas, error } = await admin()
    .from('citas')
    .select('*, terapeuta:usuarios(nombre, apellidos)')
    .eq('paciente_id', ctx.familiar.paciente_id)
    .order('fecha_inicio', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ citas: citas || [] })
}

export async function PATCH(request: Request) {
  const ctx = await getPortalSession(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { citaId } = await request.json()
  if (!citaId) return NextResponse.json({ error: 'Falta citaId' }, { status: 400 })

  const { error } = await admin()
    .from('citas')
    .update({ confirmada_por_padre: true, estado: 'confirmada' })
    .eq('id', citaId)
    .eq('paciente_id', ctx.familiar.paciente_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
