import { NextRequest, NextResponse } from 'next/server'
import { searchSpotify } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const type = searchParams.get('type') as 'album' | 'track' | null

  if (!q || !type || (type !== 'album' && type !== 'track')) {
    return NextResponse.json(
      { error: 'Missing or invalid query parameters: q and type (album|track) required' },
      { status: 400 }
    )
  }

  if (q.length < 2) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const results = await searchSpotify(q, type)
    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Spotify search error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
