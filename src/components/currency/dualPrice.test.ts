import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { dualLabel } from './dualLabel'

const rates = { USD: new Decimal(1), VES: new Decimal('0.025'), BRL: new Decimal('0.20') }

describe('dualLabel', () => {
  it('shows anchor only when no secondary', () => {
    expect(dualLabel(new Decimal(10), 'USD', null, rates)).toBe('$10.00')
  })
  it('shows anchor + secondary', () => {
    expect(dualLabel(new Decimal(10), 'USD', 'VES', rates)).toBe('$10.00 / Bs 400')
  })
})
