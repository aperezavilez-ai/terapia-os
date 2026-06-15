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

  const paciente = ctx.familiar.paciente as { clinica_id?: string }
  const adminClient = admin()

  const { data: mensajes, error } = await adminClient
    .from('chat_mensajes')
    .select('*')
    .eq('paciente_id', ctx.familiar.paciente_id)
    .order('created_at')
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient
    .from('chat_mensajes')
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq('paciente_id', ctx.familiar.paciente_id)
    .eq('tipo_remitente', 'terapeuta')
    .eq('leido', false)

  return NextResponse.json({
    mensajes: mensajes || [],
    clinicaId: paciente?.clinica_id,
  })
}

export async function POST(request: Request) {
  const ctx = await getPortalSession(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contenido } = await request.json()
  if (!contenido?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  const paciente = ctx.familiar.paciente as { clinica_id?: string }
  if (!paciente?.clinica_id) return NextResponse.json({ error: 'Paciente sin clínica' }, { status: 400 })

  const { data, error } = await admin()
    .from('chat_mensajes')
    .insert({
      clinica_id: paciente.clinica_id,
      paciente_id: ctx.familiar.paciente_id,
      remitente_id: ctx.user.id,
      tipo_remitente: 'padre',
      contenido: contenido.trim(),
      leido: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ mensaje: data })
}
