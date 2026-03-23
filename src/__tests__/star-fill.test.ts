import { describe, it, expect } from 'vitest'
import { starFill, resolveClick } from '@/components/StarRating'

describe('starFill', () => {
  describe('full stars', () => {
    it('returns full when displayed equals star index', () => {
      expect(starFill(1, 1)).toBe('full')
      expect(starFill(3, 3)).toBe('full')
      expect(starFill(5, 5)).toBe('full')
    })

    it('returns full when displayed exceeds star index', () => {
      expect(starFill(1, 5)).toBe('full')
      expect(starFill(2, 3)).toBe('full')
    })
  })

  describe('half stars', () => {
    it('returns half when displayed is exactly 0.5 below star index', () => {
      expect(starFill(1, 0.5)).toBe('half')
      expect(starFill(3, 2.5)).toBe('half')
      expect(starFill(5, 4.5)).toBe('half')
    })
  })

  describe('empty stars', () => {
    it('returns empty when displayed is well below star index', () => {
      expect(starFill(3, 1)).toBe('empty')
      expect(starFill(5, 2)).toBe('empty')
    })

    it('returns empty when displayed is 0', () => {
      expect(starFill(1, 0)).toBe('empty')
      expect(starFill(5, 0)).toBe('empty')
    })
  })

  describe('boundary cases', () => {
    it('handles all five stars at full rating', () => {
      const results = [1, 2, 3, 4, 5].map((star) => starFill(star, 5))
      expect(results).toEqual(['full', 'full', 'full', 'full', 'full'])
    })

    it('handles 3.5 rating correctly', () => {
      const results = [1, 2, 3, 4, 5].map((star) => starFill(star, 3.5))
      expect(results).toEqual(['full', 'full', 'full', 'half', 'empty'])
    })

    it('handles 1 rating correctly', () => {
      const results = [1, 2, 3, 4, 5].map((star) => starFill(star, 1))
      expect(results).toEqual(['full', 'empty', 'empty', 'empty', 'empty'])
    })

    it('handles 0.5 rating correctly', () => {
      const results = [1, 2, 3, 4, 5].map((star) => starFill(star, 0.5))
      expect(results).toEqual(['half', 'empty', 'empty', 'empty', 'empty'])
    })
  })
})

describe('resolveClick', () => {
  describe('setting a new rating', () => {
    it('sets full star when clicking a new star', () => {
      expect(resolveClick(3, null)).toBe(3)
      expect(resolveClick(5, null)).toBe(5)
      expect(resolveClick(1, null)).toBe(1)
    })

    it('sets full star when clicking a different star', () => {
      expect(resolveClick(4, 2)).toBe(4)
      expect(resolveClick(1, 5)).toBe(1)
      expect(resolveClick(3, 1.5)).toBe(3)
    })
  })

  describe('toggling to half star', () => {
    it('toggles to half when clicking the same full star', () => {
      expect(resolveClick(3, 3)).toBe(2.5)
      expect(resolveClick(5, 5)).toBe(4.5)
      expect(resolveClick(1, 1)).toBe(0.5)
    })
  })

  describe('clearing from half star', () => {
    it('clears to previous full star when clicking same half star', () => {
      expect(resolveClick(3, 2.5)).toBe(2)
      expect(resolveClick(5, 4.5)).toBe(4)
    })

    it('clears to null when clicking star 1 at 0.5', () => {
      expect(resolveClick(1, 0.5)).toBeNull()
    })
  })

  describe('full cycle', () => {
    it('cycles: null → 3 → 2.5 → 2 on repeated star 3 clicks', () => {
      const first = resolveClick(3, null)
      expect(first).toBe(3)

      const second = resolveClick(3, first)
      expect(second).toBe(2.5)

      const third = resolveClick(3, second)
      expect(third).toBe(2)
    })

    it('cycles: null → 1 → 0.5 → null on repeated star 1 clicks', () => {
      const first = resolveClick(1, null)
      expect(first).toBe(1)

      const second = resolveClick(1, first)
      expect(second).toBe(0.5)

      const third = resolveClick(1, second)
      expect(third).toBeNull()
    })
  })
})
