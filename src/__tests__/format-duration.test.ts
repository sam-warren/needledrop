import { describe, it, expect } from 'vitest'
import { formatDuration } from '@/lib/utils'

describe('formatDuration', () => {
  it('formats seconds-only duration', () => {
    expect(formatDuration(45000)).toBe('0m 45s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(383000)).toBe('6m 23s')
  })

  it('formats exactly one minute', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3720000)).toBe('1h 2m')
  })

  it('formats exactly one hour', () => {
    expect(formatDuration(3600000)).toBe('1h 0m')
  })

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0m 0s')
  })

  it('formats large album duration', () => {
    expect(formatDuration(5400000)).toBe('1h 30m')
  })
})
