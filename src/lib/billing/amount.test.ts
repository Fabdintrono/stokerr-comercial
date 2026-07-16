import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { computeMonthlyAmount } from './amount'

describe('computeMonthlyAmount', () => {
  it('plan only', () => {
    expect(computeMonthlyAmount(19.9, []).toString()).toBe('19.9')
  })
  it('plan + add-ons', () => {
    expect(computeMonthlyAmount(49.9, [10, 5.5]).toString()).toBe('65.4')
  })
  it('handles zero add-on and Decimal inputs', () => {
    expect(computeMonthlyAmount(new Decimal(0), [new Decimal(0)]).toString()).toBe('0')
  })
})
