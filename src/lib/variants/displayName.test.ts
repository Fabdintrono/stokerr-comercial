import { describe, it, expect } from 'vitest'
import { variantDisplayName } from './displayName'

describe('variantDisplayName', () => {
  it('joins attribute values with " / " in insertion order', () => {
    expect(variantDisplayName({ Talla: 'M', Color: 'Rojo' })).toBe('M / Rojo')
  })
  it('handles a single attribute', () => {
    expect(variantDisplayName({ Medida: '3/8"' })).toBe('3/8"')
  })
  it('returns empty string for no attributes', () => {
    expect(variantDisplayName({})).toBe('')
  })
})
