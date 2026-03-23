import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/spotify', () => ({
  searchSpotify: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
  }),
}))

import { GET } from '@/app/api/spotify/search/route'
import { searchSpotify } from '@/lib/spotify'

const mockSearchSpotify = vi.mocked(searchSpotify)

function createRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/spotify/search')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

describe('GET /api/spotify/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('returns 400 when q is missing', async () => {
      const res = await GET(createRequest({ type: 'album' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/missing/i)
    })

    it('returns 400 when type is missing', async () => {
      const res = await GET(createRequest({ q: 'radiohead' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when type is invalid', async () => {
      const res = await GET(createRequest({ q: 'radiohead', type: 'playlist' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when q is only whitespace', async () => {
      const res = await GET(createRequest({ q: '   ', type: 'album' }))
      expect(res.status).toBe(400)
    })

    it('returns empty array when query is too short', async () => {
      const res = await GET(createRequest({ q: 'a', type: 'album' }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([])
    })
  })

  describe('happy path', () => {
    it('returns search results for albums', async () => {
      const mockResults = [
        { id: 'album-1', type: 'album', title: 'OK Computer', artist: 'Radiohead', artwork_url: 'https://img.test/1.jpg', extra: '1997' },
      ]
      mockSearchSpotify.mockResolvedValue(mockResults)

      const res = await GET(createRequest({ q: 'radiohead', type: 'album' }))
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual(mockResults)
      expect(mockSearchSpotify).toHaveBeenCalledWith('radiohead', 'album')
    })

    it('returns search results for tracks', async () => {
      mockSearchSpotify.mockResolvedValue([])

      const res = await GET(createRequest({ q: 'paranoid android', type: 'track' }))
      expect(res.status).toBe(200)
      expect(mockSearchSpotify).toHaveBeenCalledWith('paranoid android', 'track')
    })
  })

  describe('error handling', () => {
    it('returns 502 when Spotify API fails', async () => {
      mockSearchSpotify.mockRejectedValue(new Error('Spotify search failed: 429'))

      const res = await GET(createRequest({ q: 'radiohead', type: 'album' }))
      expect(res.status).toBe(502)

      const body = await res.json()
      expect(body.error).toMatch(/Spotify search failed/)
    })

    it('handles non-Error exceptions', async () => {
      mockSearchSpotify.mockRejectedValue('unexpected string error')

      const res = await GET(createRequest({ q: 'radiohead', type: 'album' }))
      expect(res.status).toBe(502)

      const body = await res.json()
      expect(body.error).toBe('Unknown error')
    })
  })
})
