/**
 * Aplica migraciones SQL pendientes (003 + 004) si SUPABASE_DB_URL está configurada.
 *
 * Obtén la URL en Supabase → Project Settings → Database → Connection string (URI)
 * node --env-file=apps/web/.env.local apps/web/scripts/apply-pending-migrations.mjs
 *
 * Sin SUPABASE_DB_URL imprime instrucciones para el SQL Editor.
 */
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DB_URL = process.env.SUPABASE_DB_URL

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../../../supabase/migrations')

const PENDING = ['003_storage_archivos.sql', '004_rls_staff_clinico.sql']

async function ensureBucket() {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'terapia-os-files',
      name: 'terapia-os-files',
      public: false,
      file_size_limit: 10485760,
    }),
  })
  const text = await res.text()
  if (res.ok) console.log('✅ Bucket terapia-os-files listo')
  else if (text.includes('already exists') || res.status === 409) console.log('✅ Bucket ya existe')
  else console.log('⚠️  Bucket:', text.slice(0, 120))
}

async function runSql(sql) {
  const pg = await import('pg')
  const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

async function main() {
  console.log('Migraciones pendientes:', PENDING.join(', '))
  await ensureBucket()

  const files = PENDING.filter(f => {
    try {
      readFileSync(join(migrationsDir, f))
      return true
    } catch {
      console.warn(`⚠️  No encontrado: ${f}`)
      return false
    }
  })

  if (!DB_URL) {
    console.log('\n📋 Ejecuta manualmente en Supabase → SQL Editor (en orden):')
    for (const f of files) {
      console.log(`   supabase/migrations/${f}`)
    }
    console.log('\nTip: agrega SUPABASE_DB_URL a .env.local para aplicar automáticamente.')
    return
  }

  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), 'utf8')
    console.log(`\n▶ Aplicando ${f}...`)
    await runSql(sql)
    console.log(`✅ ${f}`)
  }

  console.log('\n✅ Migraciones aplicadas')
}

main().catch(err => {
  console.error('\n❌', err.message)
  console.log('\nSi falla la conexión, usa el SQL Editor con los archivos listados arriba.')
  process.exit(1)
})
