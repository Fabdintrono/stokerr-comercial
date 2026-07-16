import { describe, it, expect } from 'vitest'
import { deriveStatus } from './status'

const end = new Date('2026-07-10T00:00:00Z')

describe('deriveStatus', () => {
  it('EXPIRED when no period', () => {
    expect(deriveStatus(null, 5, new Date('2026-07-01T00:00:00Z'))).toBe('EXPIRED')
  })
  it('ACTIVE before period end', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-09T00:00:00Z'))).toBe('ACTIVE')
  })
  it('GRACE within grace window', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-13T00:00:00Z'))).toBe('GRACE')
  })
  it('EXPIRED after grace window', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-16T00:00:01Z'))).toBe('EXPIRED')
  })
  it('ACTIVE exactly at period end', () => {
    expect(deriveStatus(end, 5, end)).toBe('ACTIVE')
  })
})
