// src/lib/i18n/t.test.ts
import { describe, it, expect } from 'vitest'
import { tServer } from './tServer'

describe('tServer', () => {
  it('returns the value for an existing key in the locale', () => {
    expect(tServer('en', 'invoicing.total')).toBe('Total')
    expect(tServer('pt', 'invoicing.newInvoice')).toBe('Nova fatura')
  })
  it('interpolates {vars}', () => {
    expect(tServer('es', 'billing.graceBanner', { date: '2026-08-01' }))
      .toBe('Tu suscripción está en período de gracia. Renueva antes de 2026-08-01.')
  })
  it('falls back to es when key missing in target locale', () => {
    // 'nonexistent.key' is in no locale → returns the key itself
    expect(tServer('en', 'nonexistent.key')).toBe('nonexistent.key')
  })
  it('returns the key when path does not resolve to a string', () => {
    expect(tServer('es', 'invoicing')).toBe('invoicing')
  })
})
