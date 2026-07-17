// src/lib/modules/decideVertical.test.ts
import { describe, it, expect } from 'vitest'
import { decideVertical } from './decideVertical'

describe('decideVertical', () => {
  it('RESTAURANT when any location is a restaurant', () => {
    expect(decideVertical([{ type: 'WAREHOUSE' }, { type: 'RESTAURANT' }])).toBe('RESTAURANT')
  })
  it('RETAIL when no restaurant location', () => {
    expect(decideVertical([{ type: 'WAREHOUSE' }])).toBe('RETAIL')
    expect(decideVertical([])).toBe('RETAIL')
  })
})
