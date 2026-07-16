// scripts/i18n/mergeMissing.test.mjs
import { describe, it, expect } from 'vitest'
import { mergeMissing, missingKeys } from './mergeMissing.mjs'

describe('missingKeys', () => {
  it('lists dotted keys present in base but absent in target', () => {
    const base = { a: '1', b: { c: '2', d: '3' } }
    const target = { a: 'x', b: { c: 'y' } }
    expect(missingKeys(base, target)).toEqual(['b.d'])
  })
  it('returns [] when target has all base keys', () => {
    expect(missingKeys({ a: '1' }, { a: 'x' })).toEqual([])
  })
})

describe('mergeMissing', () => {
  it('fills missing keys from a translator without overwriting existing', () => {
    const base = { a: '1', b: { c: '2', d: '3' } }
    const target = { a: 'X', b: { c: 'Y' } }
    const translate = (key, value) => `${value}-tr`
    const merged = mergeMissing(base, target, translate)
    expect(merged).toEqual({ a: 'X', b: { c: 'Y', d: '3-tr' } })
  })
})
