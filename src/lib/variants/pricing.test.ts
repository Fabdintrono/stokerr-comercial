import { describe, it, expect } from 'vitest'
import { effectivePrice, effectiveCost } from './pricing'

describe('effective price/cost', () => {
  it('uses variant value when set', () => {
    expect(effectivePrice({ salePrice: '12.50' }, { salePrice: '10.00' })).toBe('12.50')
    expect(effectiveCost({ costPrice: '5.00' }, { costPrice: '4.00' })).toBe('5.00')
  })
  it('falls back to product value when variant is null/undefined', () => {
    expect(effectivePrice({ salePrice: null }, { salePrice: '10.00' })).toBe('10.00')
    expect(effectiveCost({}, { costPrice: '4.00' })).toBe('4.00')
  })
})
