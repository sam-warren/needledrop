import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  // Escape PostgREST special characters for ilike patterns
  const escaped = q.replace(/[%_\\]/g, '\\$&')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(5)

  return NextResponse.json(profiles ?? [])
}
