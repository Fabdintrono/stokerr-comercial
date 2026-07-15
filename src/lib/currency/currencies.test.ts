import { describe, it, expect } from 'vitest'
import { CURRENCY_META, currencyDecimals } from './currencies'

describe('currency metadata', () => {
  it('knows USD has 2 decimals', () => {
    expect(currencyDecimals('USD')).toBe(2)
  })
  it('knows VES defaults to 0 decimals', () => {
    expect(currencyDecimals('VES')).toBe(0)
  })
  it('exposes a symbol per currency', () => {
    expect(CURRENCY_META.USD.symbol).toBe('$')
    expect(CURRENCY_META.VES.symbol).toBe('Bs')
    expect(CURRENCY_META.BRL.symbol).toBe('R$')
  })
})
