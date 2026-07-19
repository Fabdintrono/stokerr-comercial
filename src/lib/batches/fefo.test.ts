import { describe, it, expect } from 'vitest'
import { pickBatchesFEFO } from './fefo'

const today = new Date('2026-07-19')
const batches = [
  { id: 'b1', quantity: 5, expiryDate: new Date('2026-08-01') },
  { id: 'b2', quantity: 10, expiryDate: new Date('2026-09-01') },
  { id: 'expired', quantity: 100, expiryDate: new Date('2026-07-01') },
]

describe('pickBatchesFEFO', () => {
  it('takes from the earliest-expiring non-expired batch first, spanning as needed', () => {
    const picks = pickBatchesFEFO(batches, 8, { today, allowExpired: false })
    expect(picks).toEqual([{ id: 'b1', take: 5 }, { id: 'b2', take: 3 }])
  })
  it('skips expired batches when allowExpired is false', () => {
    const picks = pickBatchesFEFO(batches, 5, { today, allowExpired: false })
    expect(picks).toEqual([{ id: 'b1', take: 5 }])
  })
  it('includes expired (earliest first) when allowExpired is true', () => {
    const picks = pickBatchesFEFO(batches, 3, { today, allowExpired: true })
    expect(picks).toEqual([{ id: 'expired', take: 3 }])
  })
  it('throws when available (per policy) is insufficient', () => {
    expect(() => pickBatchesFEFO(batches, 20, { today, allowExpired: false })).toThrow(/insufficient/i)
  })
  it('a batch expiring exactly today is still eligible (not treated as expired)', () => {
    const withTime = new Date('2026-07-19T15:30:00Z') // today, mid-afternoon
    const bs = [{ id: 'today', quantity: 3, expiryDate: new Date('2026-07-19') }]
    const picks = pickBatchesFEFO(bs, 2, { today: withTime, allowExpired: false })
    expect(picks).toEqual([{ id: 'today', take: 2 }])
  })
})
