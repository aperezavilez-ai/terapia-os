import { NextResponse } from 'next/server'
import { getPortalSession } from '@/lib/portal-auth'

export async function GET(request: Request) {
  const ctx = await getPortalSession(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(ctx)
}
