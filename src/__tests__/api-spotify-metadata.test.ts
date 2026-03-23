import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/spotify', () => ({
  getSpotifyAlbum: vi.fn(),
  getSpotifyTrack: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  }),
}))

import { GET } from '@/app/api/spotify/metadata/route'
import { getSpotifyAlbum, getSpotifyTrack } from '@/lib/spotify'

const mockGetAlbum = vi.mocked(getSpotifyAlbum)
const mockGetTrack = vi.mocked(getSpotifyTrack)

function createRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/spotify/metadata')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

describe('GET /api/spotify/metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('returns 400 when id is missing', async () => {
      const res = await GET(createRequest({ type: 'album' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/missing/i)
    })

    it('returns 400 when type is missing', async () => {
      const res = await GET(createRequest({ id: 'abc123' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when type is invalid', async () => {
      const res = await GET(createRequest({ id: 'abc123', type: 'podcast' }))
      expect(res.status).toBe(400)
    })
  })

  describe('happy path', () => {
    it('returns album metadata', async () => {
      const mockAlbum = {
        id: 'album-1',
        type: 'album' as const,
        name: 'OK Computer',
        artists: [{ name: 'Radiohead' }],
        images: [{ url: 'https://img.test/1.jpg', width: 640, height: 640 }],
        release_date: '1997-05-28',
        total_tracks: 12,
      }
      mockGetAlbum.mockResolvedValue(mockAlbum)

      const res = await GET(createRequest({ id: 'album-1', type: 'album' }))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.name).toBe('OK Computer')
      expect(mockGetAlbum).toHaveBeenCalledWith('album-1')
      expect(mockGetTrack).not.toHaveBeenCalled()
    })

    it('returns track metadata', async () => {
      const mockTrack = {
        id: 'track-1',
        type: 'track' as const,
        name: 'Paranoid Android',
        artists: [{ name: 'Radiohead' }],
        album: {
          name: 'OK Computer',
          images: [{ url: 'https://img.test/1.jpg', width: 640, height: 640 }],
        },
        duration_ms: 383000,
      }
      mockGetTrack.mockResolvedValue(mockTrack)

      const res = await GET(createRequest({ id: 'track-1', type: 'track' }))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.name).toBe('Paranoid Android')
      expect(mockGetTrack).toHaveBeenCalledWith('track-1')
      expect(mockGetAlbum).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('returns 500 when album fetch fails', async () => {
      mockGetAlbum.mockRejectedValue(new Error('Not Found'))

      const res = await GET(createRequest({ id: 'bad-id', type: 'album' }))
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toMatch(/Failed to fetch/)
    })

    it('returns 500 when track fetch fails', async () => {
      mockGetTrack.mockRejectedValue(new Error('Not Found'))

      const res = await GET(createRequest({ id: 'bad-id', type: 'track' }))
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error).toMatch(/Failed to fetch/)
    })
  })
})
