// src/lib/i18n/normalizeLocale.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeLocale, LOCALES } from './normalizeLocale'

describe('normalizeLocale', () => {
  it('maps legacy region codes to short codes', () => {
    expect(normalizeLocale('pt-PT')).toBe('pt')
    expect(normalizeLocale('es-ES')).toBe('es')
    expect(normalizeLocale('en-GB')).toBe('en')
  })
  it('passes through valid short codes', () => {
    expect(normalizeLocale('es')).toBe('es')
    expect(normalizeLocale('pt')).toBe('pt')
    expect(normalizeLocale('en')).toBe('en')
  })
  it('falls back to es for unknown / empty / null', () => {
    expect(normalizeLocale('fr')).toBe('es')
    expect(normalizeLocale('')).toBe('es')
    expect(normalizeLocale(null)).toBe('es')
    expect(normalizeLocale(undefined)).toBe('es')
  })
  it('exposes the supported locale list', () => {
    expect(LOCALES).toEqual(['es', 'pt', 'en'])
  })
})
