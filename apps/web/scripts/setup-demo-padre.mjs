/**
 * Crea datos demo: sucursal, paciente, familiar, cuenta padre, cita y reporte.
 * node --env-file=apps/web/.env.local apps/web/scripts/setup-demo-padre.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const DEMO = {
  padreEmail: 'padre.demo@aprendamosjuntos.mx',
  padrePassword: 'Padre2026!',
  padreNombre: 'María',
  padreApellidos: 'García López',
  pacienteNombre: 'Santiago',
  pacienteApellidos: 'García López',
  pacienteNacimiento: '2019-03-15',
  diagnostico: 'Trastorno del Espectro Autista (TEA)',
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      ...headers,
      Prefer: options.prefer || 'return=representation',
      ...options.headers,
    },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}: ${text}`)
  return data
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} → ${res.status}: ${text}`)
  return data
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Faltan variables de entorno Supabase')
    process.exit(1)
  }

  console.log('1. Obteniendo clínica...')
  const clinicas = await rest('/clinicas?select=id,nombre&limit=1')
  const clinicaId = clinicas[0]?.id
  if (!clinicaId) throw new Error('No hay clínica')
  console.log(`   ${clinicas[0].nombre} (${clinicaId})`)

  console.log('2. Creando sucursal demo si no existe...')
  let sucursales = await rest(`/sucursales?select=id,nombre&clinica_id=eq.${clinicaId}&limit=1`)
  let sucursalId = sucursales[0]?.id
  if (!sucursalId) {
    sucursales = await rest('/sucursales', {
      method: 'POST',
      body: JSON.stringify({
        clinica_id: clinicaId,
        nombre: 'Sucursal Principal',
        ciudad: 'Guadalajara',
        activa: true,
      }),
    })
    sucursalId = sucursales[0].id
  }
  console.log(`   Sucursal: ${sucursalId}`)

  console.log('3. Obteniendo terapeuta/admin...')
  const staff = await rest(`/usuarios?select=id,nombre,apellidos,rol&clinica_id=eq.${clinicaId}&rol=neq.padre&limit=1`)
  const terapeutaId = staff[0]?.id
  if (!terapeutaId) throw new Error('No hay usuario staff')
  console.log(`   ${staff[0].nombre} ${staff[0].apellidos}`)

  console.log('4. Creando paciente demo...')
  let pacientes = await rest(`/pacientes?select=id&clinica_id=eq.${clinicaId}&nombre=eq.${DEMO.pacienteNombre}&limit=1`)
  let pacienteId = pacientes[0]?.id
  if (!pacienteId) {
    pacientes = await rest('/pacientes', {
      method: 'POST',
      body: JSON.stringify({
        clinica_id: clinicaId,
        sucursal_id: sucursalId,
        terapeuta_asignado_id: terapeutaId,
        nombre: DEMO.pacienteNombre,
        apellidos: DEMO.pacienteApellidos,
        fecha_nacimiento: DEMO.pacienteNacimiento,
        motivo_consulta: 'Evaluación inicial de terapia ocupacional',
        activo: true,
      }),
    })
    pacienteId = pacientes[0].id
  }
  console.log(`   Paciente: ${DEMO.pacienteNombre} ${DEMO.pacienteApellidos} (${pacienteId})`)

  console.log('5. Eliminando cuenta padre demo previa si existe...')
  const existingUsers = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  for (const u of existingUsers.users || []) {
    if (u.email === DEMO.padreEmail) {
      await adminFetch(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
      console.log(`   Eliminado auth: ${u.email}`)
    }
  }

  console.log('6. Creando cuenta auth padre...')
  const authUser = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: DEMO.padreEmail,
      password: DEMO.padrePassword,
      email_confirm: true,
      user_metadata: { nombre: DEMO.padreNombre, apellidos: DEMO.padreApellidos },
    }),
  })

  console.log('7. Creando perfil usuarios (rol padre)...')
  await rest('/usuarios', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      id: authUser.id,
      clinica_id: clinicaId,
      nombre: DEMO.padreNombre,
      apellidos: DEMO.padreApellidos,
      email: DEMO.padreEmail,
      rol: 'padre',
      activo: true,
    }),
  })

  console.log('8. Creando familiar vinculado...')
  const familiares = await rest(`/familiares?select=id&paciente_id=eq.${pacienteId}&email=eq.${DEMO.padreEmail}&limit=1`)
  if (familiares[0]?.id) {
    await rest(`/familiares?id=eq.${familiares[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        auth_user_id: authUser.id,
        tiene_acceso_portal: true,
        tipo_relacion: 'madre',
        nombre: DEMO.padreNombre,
        apellidos: DEMO.padreApellidos,
        telefono: '+52 33 1234 5678',
      }),
    })
  } else {
    await rest('/familiares', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        paciente_id: pacienteId,
        tipo_relacion: 'madre',
        nombre: DEMO.padreNombre,
        apellidos: DEMO.padreApellidos,
        telefono: '+52 33 1234 5678',
        email: DEMO.padreEmail,
        tiene_acceso_portal: true,
        auth_user_id: authUser.id,
        es_contacto_principal: true,
      }),
    })
  }

  console.log('9. Creando cita demo...')
  const in3days = new Date()
  in3days.setDate(in3days.getDate() + 3)
  in3days.setHours(10, 0, 0, 0)
  const fin = new Date(in3days)
  fin.setHours(11, 0, 0, 0)

  const citasExistentes = await rest(`/citas?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (!citasExistentes[0]) {
    try {
      await rest('/citas', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({
          clinica_id: clinicaId,
          sucursal_id: sucursalId,
          paciente_id: pacienteId,
          terapeuta_id: terapeutaId,
          fecha_inicio: in3days.toISOString(),
          fecha_fin: fin.toISOString(),
          duracion_minutos: 60,
          estado: 'programada',
          tipo: 'terapia',
          sala: 'Sala 1',
        }),
      })
    } catch (e) {
      console.log('   (cita omitida:', e.message.split('\n')[0], ')')
    }
  }

  console.log('10. Creando reporte demo compartido...')
  const reporteBody = {
    paciente_id: pacienteId,
    clinica_id: clinicaId,
    generado_por: terapeutaId,
    tipo: 'mensual',
    titulo: 'Reporte de progreso - Santiago',
    contenido: `## Resumen del mes\n\nSantiago ha mostrado avances importantes en motricidad fina y regulación sensorial.\n\n### Avances\n- Mejoró el agarre del lápiz\n- Mayor tolerancia a texturas nuevas\n- Participa con más entusiasmo en las actividades\n\n### Recomendaciones para casa\n- Practicar enhebrado 10 minutos al día\n- Actividades con plastilina suave\n\n_Este reporte fue compartido por el terapeuta._`,
    enviado_a_padres: true,
  }
  try {
    await rest('/reportes_ia', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(reporteBody) })
  } catch {
    delete reporteBody.enviado_a_padres
    await rest('/reportes_ia', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(reporteBody) })
    console.log('   (columna enviado_a_padres no existe aún — ejecuta 002_portal_padres.sql)')
  }

  console.log('11. Verificando login padre...')
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO.padreEmail, password: DEMO.padrePassword }),
  })
  if (!login.ok) throw new Error('Login padre falló: ' + await login.text())

  console.log('\n✅ Demo listo')
  console.log('──────────────────────────────────────────')
  console.log('PACIENTE:  Santiago García López')
  console.log('PADRE:     María García López')
  console.log(`Email:     ${DEMO.padreEmail}`)
  console.log(`Password:  ${DEMO.padrePassword}`)
  console.log('Login:     https://www.aprendamosjuntos.mx/auth/login')
  console.log('Portal:    https://www.aprendamosjuntos.mx/portal/citas')
  console.log('──────────────────────────────────────────')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
