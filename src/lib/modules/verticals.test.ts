// src/lib/modules/verticals.test.ts
import { describe, it, expect } from 'vitest'
import { VERTICAL_PRESETS, presetModules, VERTICALS } from './verticals'
import { MODULE_KEYS } from './registry'

describe('presetModules', () => {
  it('returns the preset for each vertical', () => {
    expect(presetModules('RESTAURANT')).toEqual(['RESTAURANT'])
    expect(presetModules('FASTFOOD')).toEqual(['RESTAURANT', 'BATCHES'])
    expect(presetModules('WHOLESALE')).toEqual(['WHOLESALE'])
    expect(presetModules('HARDWARE')).toEqual(['VARIANTS'])
    expect(presetModules('PHARMACY')).toEqual(['BATCHES', 'VARIANTS'])
    expect(presetModules('RETAIL')).toEqual([])
  })
})

describe('preset integrity', () => {
  it('lists all 6 verticals', () => {
    expect(VERTICALS).toEqual(['RESTAURANT', 'FASTFOOD', 'WHOLESALE', 'HARDWARE', 'PHARMACY', 'RETAIL'])
  })
  it('every preset module key exists in the registry', () => {
    for (const v of VERTICALS) {
      for (const k of VERTICAL_PRESETS[v]) {
        expect(MODULE_KEYS).toContain(k)
      }
    }
  })
})
