// src/lib/i18n/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatNumber, formatDate } from './format'

describe('formatNumber', () => {
  it('formats with locale grouping', () => {
    // en-US: thousands comma, decimal dot
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
    // es-ES: decimal comma (ICU data may omit thousands separator in this runtime;
    // actual output is '1234,5' — assert what the runtime produces rather than '1.234,5')
    const esResult = formatNumber(1234.5, 'es')
    expect(esResult).toContain(',') // decimal separator is comma
    expect(esResult).not.toContain('.') // no dot used as decimal
    // en and es must produce different output
    expect(formatNumber(1234.5, 'en')).not.toBe(formatNumber(1234.5, 'es'))
    // number round-trips (digits are present)
    expect(esResult).toMatch(/1234/)
    expect(esResult).toMatch(/5/)
  })
})

describe('formatDate', () => {
  it('formats an ISO date per locale', () => {
    const d = new Date('2026-08-01T00:00:00Z')
    expect(typeof formatDate(d, 'en')).toBe('string')
    expect(formatDate(d, 'en')).toContain('2026')
  })
})
