import { createClient } from '@/lib/supabase/client'

async function getAccessToken() {
  const supabase = createClient()
  await supabase.auth.getUser()

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token

  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  return refreshed?.access_token ?? null
}

export async function portalFetch(path: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()

  const headers = new Headers(options.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })
}
