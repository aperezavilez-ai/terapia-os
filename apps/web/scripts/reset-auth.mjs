/**
 * Reinicia usuarios de auth y crea cuenta admin limpia.
 * Uso: node --env-file=apps/web/.env.local apps/web/scripts/reset-auth.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const ADMIN = {
  email: 'admin@aprendamosjuntos.mx',
  password: 'Aprendamos2026!',
  nombre: 'Administrador',
  apellidos: 'Aprendamos Juntos',
  rol: 'admin_general',
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} → ${res.status}: ${text}`)
  }
  return data
}

async function restFetch(path, options = {}) {
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
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(`REST ${path} → ${res.status}: ${text}`)
  }
  return data
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('1. Listando usuarios auth...')
  const list = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  const users = list.users || []
  console.log(`   Encontrados: ${users.length}`)

  console.log('2. Eliminando usuarios auth...')
  for (const u of users) {
    await adminFetch(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
    console.log(`   Eliminado: ${u.email}`)
  }

  console.log('3. Obteniendo clínica...')
  let clinicas = await restFetch('/clinicas?select=id,nombre&limit=1')
  let clinicaId = clinicas[0]?.id

  if (!clinicaId) {
    console.log('   Creando clínica Aprendamos Juntos...')
    clinicas = await restFetch('/clinicas', {
      method: 'POST',
      body: JSON.stringify({ nombre: 'Aprendamos Juntos', activa: true }),
    })
    clinicaId = clinicas[0].id
  } else {
    await restFetch(`/clinicas?id=eq.${clinicaId}`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Aprendamos Juntos' }),
      prefer: 'return=minimal',
    })
  }
  console.log(`   Clínica: ${clinicaId}`)

  console.log('4. Creando usuario admin en auth...')
  const authUser = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: { nombre: ADMIN.nombre, apellidos: ADMIN.apellidos },
    }),
  })

  console.log('5. Creando perfil en tabla usuarios...')
  await restFetch('/usuarios', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      id: authUser.id,
      clinica_id: clinicaId,
      nombre: ADMIN.nombre,
      apellidos: ADMIN.apellidos,
      email: ADMIN.email,
      rol: ADMIN.rol,
      activo: true,
    }),
  })

  console.log('6. Verificando login...')
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  })
  const loginData = await loginRes.json()
  if (!loginRes.ok) {
    throw new Error(`Login test failed: ${JSON.stringify(loginData)}`)
  }

  console.log('\n✅ Auth reiniciado correctamente')
  console.log('─────────────────────────────────')
  console.log(`Email:    ${ADMIN.email}`)
  console.log(`Password: ${ADMIN.password}`)
  console.log('─────────────────────────────────')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
