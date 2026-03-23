import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env vars before importing the module
vi.stubEnv('SPOTIFY_CLIENT_ID', 'test-client-id')
vi.stubEnv('SPOTIFY_CLIENT_SECRET', 'test-client-secret')

const mockTokenResponse = {
  access_token: 'mock-token-123',
  token_type: 'Bearer',
  expires_in: 3600,
}

const mockAlbumSearchResponse = {
  albums: {
    items: [
      {
        id: 'album-1',
        type: 'album',
        name: 'OK Computer',
        artists: [{ name: 'Radiohead' }],
        images: [{ url: 'https://img.spotify.com/album1.jpg', width: 640, height: 640 }],
        release_date: '1997-05-28',
        total_tracks: 12,
      },
      {
        id: 'album-2',
        type: 'album',
        name: 'Kid A',
        artists: [{ name: 'Radiohead' }],
        images: [],
        release_date: '2000-10-02',
        total_tracks: 10,
      },
    ],
  },
}

const mockTrackSearchResponse = {
  tracks: {
    items: [
      {
        id: 'track-1',
        type: 'track',
        name: 'Paranoid Android',
        artists: [{ name: 'Radiohead' }],
        album: {
          name: 'OK Computer',
          images: [{ url: 'https://img.spotify.com/album1.jpg', width: 640, height: 640 }],
        },
        duration_ms: 383000,
      },
    ],
  },
}

const mockAlbumResponse = {
  id: 'album-1',
  type: 'album',
  name: 'OK Computer',
  artists: [{ name: 'Radiohead' }],
  images: [{ url: 'https://img.spotify.com/album1.jpg', width: 640, height: 640 }],
  release_date: '1997-05-28',
  total_tracks: 12,
}

const mockTrackResponse = {
  id: 'track-1',
  type: 'track',
  name: 'Paranoid Android',
  artists: [{ name: 'Radiohead' }],
  album: {
    name: 'OK Computer',
    images: [{ url: 'https://img.spotify.com/album1.jpg', width: 640, height: 640 }],
  },
  duration_ms: 383000,
}

const mockArtistResponse = {
  id: 'artist-1',
  name: 'Radiohead',
  genres: ['art rock', 'alternative rock', 'electronic'],
  images: [{ url: 'https://img.spotify.com/artist1.jpg', width: 640, height: 640 }],
}

function createFetchMock(responses: Array<{ ok: boolean; json?: unknown; status?: number; statusText?: string; text?: string }>) {
  let callIndex = 0
  return vi.fn(async () => {
    const response = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      statusText: response.statusText ?? (response.ok ? 'OK' : 'Internal Server Error'),
      json: async () => response.json,
      text: async () => response.text ?? '',
    }
  })
}

describe('Spotify lib', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('SPOTIFY_CLIENT_ID', 'test-client-id')
    vi.stubEnv('SPOTIFY_CLIENT_SECRET', 'test-client-secret')
  })

  describe('getSpotifyToken', () => {
    it('fetches a token from Spotify', async () => {
      const fetchMock = createFetchMock([{ ok: true, json: mockTokenResponse }])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyToken } = await import('@/lib/spotify')
      const token = await getSpotifyToken()

      expect(token).toBe('mock-token-123')
      expect(fetchMock).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          body: 'grant_type=client_credentials',
        })
      )
    })

    it('caches the token on subsequent calls', async () => {
      const fetchMock = createFetchMock([{ ok: true, json: mockTokenResponse }])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyToken } = await import('@/lib/spotify')
      await getSpotifyToken()
      await getSpotifyToken()

      // Should only fetch once — second call uses cache
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('throws when credentials are missing', async () => {
      vi.stubEnv('SPOTIFY_CLIENT_ID', '')
      vi.stubEnv('SPOTIFY_CLIENT_SECRET', '')

      const { getSpotifyToken } = await import('@/lib/spotify')
      await expect(getSpotifyToken()).rejects.toThrow('Missing Spotify credentials')
    })

    it('throws when token request fails', async () => {
      const fetchMock = createFetchMock([
        { ok: false, statusText: 'Unauthorized' },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyToken } = await import('@/lib/spotify')
      await expect(getSpotifyToken()).rejects.toThrow('Failed to fetch Spotify token')
    })
  })

  describe('searchSpotify', () => {
    it('searches albums and maps results correctly', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockAlbumSearchResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      const results = await searchSpotify('radiohead', 'album')

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        id: 'album-1',
        type: 'album',
        title: 'OK Computer',
        artist: 'Radiohead',
        artwork_url: 'https://img.spotify.com/album1.jpg',
        extra: '1997',
      })
    })

    it('handles albums with no images', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockAlbumSearchResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      const results = await searchSpotify('radiohead', 'album')

      expect(results[1].artwork_url).toBeNull()
    })

    it('searches tracks and maps results correctly', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockTrackSearchResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      const results = await searchSpotify('paranoid android', 'track')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        id: 'track-1',
        type: 'track',
        title: 'Paranoid Android',
        artist: 'Radiohead',
        artwork_url: 'https://img.spotify.com/album1.jpg',
        extra: 'OK Computer',
      })
    })

    it('joins multiple artist names with commas', async () => {
      const multiArtistResponse = {
        tracks: {
          items: [{
            id: 'track-2',
            type: 'track',
            name: 'Collab Track',
            artists: [{ name: 'Artist A' }, { name: 'Artist B' }, { name: 'Artist C' }],
            album: { name: 'Collab Album', images: [] },
            duration_ms: 200000,
          }],
        },
      }
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: multiArtistResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      const results = await searchSpotify('collab', 'track')

      expect(results[0].artist).toBe('Artist A, Artist B, Artist C')
    })

    it('returns empty array when no results', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: { albums: { items: [] } } },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      const results = await searchSpotify('nonexistent', 'album')

      expect(results).toEqual([])
    })

    it('throws when search API fails', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: false, status: 429, statusText: 'Too Many Requests', text: 'rate limited' },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { searchSpotify } = await import('@/lib/spotify')
      await expect(searchSpotify('radiohead', 'album')).rejects.toThrow('Spotify search failed')
    })
  })

  describe('getSpotifyAlbum', () => {
    it('fetches album by ID', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockAlbumResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyAlbum } = await import('@/lib/spotify')
      const album = await getSpotifyAlbum('album-1')

      expect(album.name).toBe('OK Computer')
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.spotify.com/v1/albums/album-1',
        expect.any(Object)
      )
    })

    it('throws when album not found', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: false, statusText: 'Not Found' },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyAlbum } = await import('@/lib/spotify')
      await expect(getSpotifyAlbum('nonexistent')).rejects.toThrow('Spotify album fetch failed')
    })
  })

  describe('getSpotifyTrack', () => {
    it('fetches track by ID', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockTrackResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyTrack } = await import('@/lib/spotify')
      const track = await getSpotifyTrack('track-1')

      expect(track.name).toBe('Paranoid Android')
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.spotify.com/v1/tracks/track-1',
        expect.any(Object)
      )
    })

    it('throws when track not found', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: false, statusText: 'Not Found' },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyTrack } = await import('@/lib/spotify')
      await expect(getSpotifyTrack('nonexistent')).rejects.toThrow('Spotify track fetch failed')
    })
  })

  describe('getSpotifyArtist', () => {
    it('fetches artist by ID', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: true, json: mockArtistResponse },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyArtist } = await import('@/lib/spotify')
      const artist = await getSpotifyArtist('artist-1')

      expect(artist.name).toBe('Radiohead')
      expect(artist.genres).toEqual(['art rock', 'alternative rock', 'electronic'])
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.spotify.com/v1/artists/artist-1',
        expect.any(Object)
      )
    })

    it('throws when artist not found', async () => {
      const fetchMock = createFetchMock([
        { ok: true, json: mockTokenResponse },
        { ok: false, statusText: 'Not Found' },
      ])
      vi.stubGlobal('fetch', fetchMock)

      const { getSpotifyArtist } = await import('@/lib/spotify')
      await expect(getSpotifyArtist('nonexistent')).rejects.toThrow('Spotify artist fetch failed')
    })
  })
})
