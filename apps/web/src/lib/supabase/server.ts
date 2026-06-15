import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function parseCookieHeader(header: string) {
  if (!header) return [] as { name: string; value: string }[]
  return header.split(';').map(part => {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) return { name: trimmed, value: '' }
    return {
      name: trimmed.slice(0, eq),
      value: decodeURIComponent(trimmed.slice(eq + 1)),
    }
  })
}

function createServerClientWithCookies(
  getAll: () => { name: string; value: string }[],
  setAll?: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => void
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll,
        setAll: setAll ?? (() => {}),
      },
    }
  )
}

export function createClient() {
  const cookieStore = cookies()

  return createServerClientWithCookies(
    () => cookieStore.getAll(),
    cookiesToSet => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // Ignorar en Server Components de solo lectura
      }
    }
  )
}

/** Lee cookies HttpOnly desde el header Cookie (Route Handlers / API). */
export function createClientFromRequest(request: Request) {
  return createServerClientWithCookies(() =>
    parseCookieHeader(request.headers.get('cookie') ?? '')
  )
}
