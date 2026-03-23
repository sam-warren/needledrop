export interface SpotifyAlbum {
  id: string
  type: 'album'
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; width: number; height: number }[]
  release_date: string
  total_tracks: number
  tracks: {
    items: {
      id: string
      name: string
      track_number: number
      duration_ms: number
      artists: { id: string; name: string }[]
    }[]
  }
}

export interface SpotifyTrack {
  id: string
  type: 'track'
  name: string
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
}

export interface SpotifySearchResult {
  id: string
  type: 'album' | 'track'
  title: string
  artist: string
  artwork_url: string | null
  extra?: string
}

let cachedToken: string | null = null
let tokenExpiresAt = 0

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch Spotify token: ${res.statusText}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000

  return cachedToken!
}

export async function searchSpotify(
  query: string,
  type: 'album' | 'track'
): Promise<SpotifySearchResult[]> {
  const token = await getSpotifyToken()

  const params = new URLSearchParams({
    q: query,
    type,
    limit: '10',
    market: 'US',
  })

  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Spotify search failed: ${res.status} ${res.statusText} — ${body}`)
  }

  const data = await res.json()

  if (type === 'album') {
    return (data.albums?.items ?? []).map((album: SpotifyAlbum) => ({
      id: album.id,
      type: 'album' as const,
      title: album.name,
      artist: album.artists.map((a) => a.name).join(', '),
      artwork_url: album.images[0]?.url ?? null,
      extra: album.release_date?.split('-')[0],
    }))
  }

  return (data.tracks?.items ?? []).map((track: SpotifyTrack) => ({
    id: track.id,
    type: 'track' as const,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    artwork_url: track.album.images[0]?.url ?? null,
    extra: track.album.name,
  }))
}

export async function getSpotifyAlbum(spotifyId: string): Promise<SpotifyAlbum> {
  const token = await getSpotifyToken()
  const res = await fetch(`https://api.spotify.com/v1/albums/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Spotify album fetch failed: ${res.statusText}`)
  return res.json()
}

export async function getSpotifyTrack(spotifyId: string): Promise<SpotifyTrack> {
  const token = await getSpotifyToken()
  const res = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Spotify track fetch failed: ${res.statusText}`)
  return res.json()
}

export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  images: { url: string; width: number; height: number }[]
}

export async function getSpotifyArtist(artistId: string): Promise<SpotifyArtist> {
  const token = await getSpotifyToken()
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Spotify artist fetch failed: ${res.statusText}`)
  return res.json()
}
