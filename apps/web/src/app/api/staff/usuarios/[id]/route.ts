import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ROLES_STAFF = ['admin_general', 'director_clinico', 'terapeuta', 'recepcion']

async function getStaffContext() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: staff } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', user.id)
    .single()

  if (!staff || !['admin_general', 'director_clinico'].includes(staff.rol)) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
  }

  return { staff, userId: user.id }
}

async function getTargetUser(clinicaId: string, targetId: string) {
  const admin = adminClient()
  const { data: target, error } = await admin
    .from('usuarios')
    .select('id, clinica_id, rol, activo, nombre, apellidos, email, telefono')
    .eq('id', targetId)
    .single()

  if (error || !target || target.clinica_id !== clinicaId) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 }) }
  }

  return { target }
}

async function countActiveAdmins(clinicaId: string) {
  const admin = adminClient()
  const { count } = await admin
    .from('usuarios')
    .select('id', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId)
    .eq('rol', 'admin_general')
    .eq('activo', true)

  return count || 0
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const ctx = await getStaffContext()
    if ('error' in ctx && ctx.error) return ctx.error

    const { staff, userId } = ctx
    const targetRes = await getTargetUser(staff!.clinica_id, params.id)
    if ('error' in targetRes && targetRes.error) return targetRes.error

    const { target } = targetRes
    const body = await request.json()
    const { nombre, apellidos, rol, telefono, activo } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      nombre: nombre.trim(),
      apellidos: (apellidos || '').trim(),
      telefono: telefono?.trim() || null,
    }

    if (target!.rol !== 'padre') {
      if (rol && !ROLES_STAFF.includes(rol)) {
        return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
      }
      if (rol) {
        if (target!.rol === 'admin_general' && rol !== 'admin_general') {
          const admins = await countActiveAdmins(staff!.clinica_id)
          if (admins <= 1) {
            return NextResponse.json({ error: 'Debe haber al menos un administrador activo' }, { status: 400 })
          }
        }
        updates.rol = rol
      }
    }

    if (typeof activo === 'boolean') {
      if (!activo && target!.id === userId) {
        return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 })
      }
      if (!activo && target!.rol === 'admin_general') {
        const admins = await countActiveAdmins(staff!.clinica_id)
        if (admins <= 1) {
          return NextResponse.json({ error: 'Debe haber al menos un administrador activo' }, { status: 400 })
        }
      }
      updates.activo = activo
    }

    const admin = adminClient()
    const { error: updateError } = await admin.from('usuarios').update(updates).eq('id', params.id)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    if (typeof activo === 'boolean') {
      await admin.auth.admin.updateUserById(params.id, {
        ban_duration: activo ? 'none' : '876000h',
      })
    }

    await admin.auth.admin.updateUserById(params.id, {
      user_metadata: {
        nombre: updates.nombre,
        apellidos: updates.apellidos,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const ctx = await getStaffContext()
    if ('error' in ctx && ctx.error) return ctx.error

    const { staff, userId } = ctx
    const targetRes = await getTargetUser(staff!.clinica_id, params.id)
    if ('error' in targetRes && targetRes.error) return targetRes.error

    const { target } = targetRes

    if (target!.id === userId) {
      return NextResponse.json({ error: 'No puedes quitar tu propio acceso' }, { status: 400 })
    }

    if (target!.rol === 'admin_general') {
      const admins = await countActiveAdmins(staff!.clinica_id)
      if (admins <= 1) {
        return NextResponse.json({ error: 'Debe haber al menos un administrador activo' }, { status: 400 })
      }
    }

    const admin = adminClient()
    const { error: updateError } = await admin
      .from('usuarios')
      .update({ activo: false })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await admin.auth.admin.updateUserById(params.id, { ban_duration: '876000h' })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
