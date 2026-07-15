import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { effectiveRate } from './rateEngine'

function loader(rows: { currency: string; rate: string; date: string }[]) {
  return async (currency: string, date: Date) => {
    const match = rows
      .filter(r => r.currency === currency && new Date(r.date) <= date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return match ? new Decimal(match.rate) : null
  }
}

describe('effectiveRate', () => {
  it('base currency is always 1', async () => {
    const r = await effectiveRate('USD', 'USD', new Date('2026-07-15'), loader([]))
    expect(r.toString()).toBe('1')
  })
  it('uses the row for the given day', async () => {
    const r = await effectiveRate('VES', 'USD', new Date('2026-07-15'),
      loader([{ currency: 'VES', rate: '0.025', date: '2026-07-15' }]))
    expect(r.toString()).toBe('0.025')
  })
  it('carries forward the last known rate when today has none', async () => {
    const r = await effectiveRate('VES', 'USD', new Date('2026-07-15'),
      loader([{ currency: 'VES', rate: '0.026', date: '2026-07-14' }]))
    expect(r.toString()).toBe('0.026')
  })
  it('throws if no rate ever exists (never returns 0)', async () => {
    await expect(effectiveRate('VES', 'USD', new Date('2026-07-15'), loader([])))
      .rejects.toThrow(/no rate/i)
  })
})
