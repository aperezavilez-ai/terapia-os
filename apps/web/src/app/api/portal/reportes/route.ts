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

  const adminClient = admin()
  let reportesQuery = adminClient
    .from('reportes_ia')
    .select('*')
    .eq('paciente_id', ctx.familiar.paciente_id)
    .order('created_at', { ascending: false })

  let { data: reportes, error: reportesError } = await reportesQuery.eq('enviado_a_padres', true)
  if (reportesError) {
    const fallback = await reportesQuery
    reportes = fallback.data
  }

  const { data: archivos } = await adminClient
    .from('archivos_paciente')
    .select('*')
    .eq('paciente_id', ctx.familiar.paciente_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ reportes: reportes || [], archivos: archivos || [] })
}
