import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyAlbum, getSpotifyTrack } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') as 'album' | 'track' | null

  if (!id || !type || (type !== 'album' && type !== 'track')) {
    return NextResponse.json(
      { error: 'Missing or invalid query parameters: id and type (album|track) required' },
      { status: 400 }
    )
  }

  try {
    const data = type === 'album' ? await getSpotifyAlbum(id) : await getSpotifyTrack(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Spotify metadata error:', error)
    return NextResponse.json({ error: 'Failed to fetch Spotify metadata' }, { status: 500 })
  }
}
