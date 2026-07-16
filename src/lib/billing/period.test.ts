import { describe, it, expect } from 'vitest'
import { addOneMonth, nextPeriodEnd } from './period'

describe('addOneMonth', () => {
  it('adds one calendar month', () => {
    expect(addOneMonth(new Date('2026-01-15T00:00:00Z')).toISOString()).toBe('2026-02-15T00:00:00.000Z')
  })
})

describe('nextPeriodEnd', () => {
  it('extends from now when expired (currentEnd in past)', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    const r = nextPeriodEnd(new Date('2026-07-01T00:00:00Z'), now)
    expect(r.toISOString()).toBe('2026-08-20T00:00:00.000Z')
  })
  it('stacks from currentEnd when still active (future)', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    const r = nextPeriodEnd(new Date('2026-07-25T00:00:00Z'), now)
    expect(r.toISOString()).toBe('2026-08-25T00:00:00.000Z')
  })
  it('extends from now when currentEnd is null', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    expect(nextPeriodEnd(null, now).toISOString()).toBe('2026-08-20T00:00:00.000Z')
  })
})
