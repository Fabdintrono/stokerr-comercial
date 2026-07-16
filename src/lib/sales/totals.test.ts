import { describe, it, expect } from 'vitest'
import { computeTotals } from './totals'

describe('computeTotals', () => {
  it('no tax: total equals subtotal', () => {
    const t = computeTotals([{ quantity: 2, unitPrice: 10 }], false, 0)
    expect(t.subtotal.toString()).toBe('20')
    expect(t.tax.toString()).toBe('0')
    expect(t.total.toString()).toBe('20')
  })
  it('per-line vatRate when tax enabled', () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100, vatRate: 16 }], true, 0)
    expect(t.tax.toString()).toBe('16')
    expect(t.total.toString()).toBe('116')
  })
  it('falls back to default rate when line has no vatRate', () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100 }], true, 10)
    expect(t.tax.toString()).toBe('10')
    expect(t.total.toString()).toBe('110')
  })
  it('sums mixed lines', () => {
    const t = computeTotals([{ quantity: 2, unitPrice: 50 }, { quantity: 1, unitPrice: 30 }], false, 0)
    expect(t.subtotal.toString()).toBe('130')
  })
})
