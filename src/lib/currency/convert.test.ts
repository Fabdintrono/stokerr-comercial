import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { convert, formatMoney } from './convert'

const rates = { USD: new Decimal(1), VES: new Decimal('0.025'), BRL: new Decimal('0.20') }

describe('convert', () => {
  it('returns same amount when from === to', () => {
    expect(convert(new Decimal(10), 'USD', 'USD', rates).toString()).toBe('10')
  })
  it('converts base -> secondary (USD 10 -> VES 400)', () => {
    expect(convert(new Decimal(10), 'USD', 'VES', rates).toString()).toBe('400')
  })
  it('converts secondary -> base (VES 400 -> USD 10)', () => {
    expect(convert(new Decimal(400), 'VES', 'USD', rates).toString()).toBe('10')
  })
  it('round-trips through base without loss', () => {
    const back = convert(convert(new Decimal(7), 'BRL', 'VES', rates), 'VES', 'BRL', rates)
    expect(back.toDecimalPlaces(6).toString()).toBe('7')
  })
})

describe('formatMoney', () => {
  it('formats USD with 2 decimals and symbol', () => {
    expect(formatMoney(new Decimal('10.5'), 'USD')).toBe('$10.50')
  })
  it('rounds VES to integer', () => {
    expect(formatMoney(new Decimal('399.6'), 'VES')).toBe('Bs 400')
  })
})
