// src/lib/i18n/parity.test.ts
import { describe, it, expect } from 'vitest'
import es from '../../../locales/es.json'
import pt from '../../../locales/pt.json'
import en from '../../../locales/en.json'

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' ? flatKeys(v as Record<string, unknown>, key) : [key]
  })
}

describe('locale key parity', () => {
  const esKeys = flatKeys(es).sort()
  it('pt has exactly the same keys as es', () => {
    expect(flatKeys(pt).sort()).toEqual(esKeys)
  })
  it('en has exactly the same keys as es', () => {
    expect(flatKeys(en).sort()).toEqual(esKeys)
  })
})
