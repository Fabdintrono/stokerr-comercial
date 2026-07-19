import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, MODULE_KEYS } from './registry'

describe('module registry', () => {
  it('defines FINANCE, BI, CRM', () => {
    expect(MODULE_KEYS).toContain('BI')
    expect(MODULE_KEYS).toContain('CRM')
    expect(MODULE_KEYS).toContain('FINANCE')
  })
  it('each module has a label', () => {
    for (const k of MODULE_KEYS) {
      expect(MODULE_REGISTRY[k].label.length).toBeGreaterThan(0)
    }
  })
})

describe('registry verticals extension', () => {
  it('includes the 4 new module keys', () => {
    for (const k of ['RESTAURANT', 'WHOLESALE', 'VARIANTS', 'BATCHES'] as const) {
      expect(MODULE_KEYS).toContain(k)
    }
  })
  it('every module has a valid status', () => {
    for (const k of MODULE_KEYS) {
      expect(['LIVE', 'COMING_SOON']).toContain(MODULE_REGISTRY[k].status)
    }
  })
  it('RESTAURANT/VARIANTS/BATCHES are LIVE; WHOLESALE is COMING_SOON', () => {
    expect(MODULE_REGISTRY.RESTAURANT.status).toBe('LIVE')
    expect(MODULE_REGISTRY.WHOLESALE.status).toBe('COMING_SOON')
    expect(MODULE_REGISTRY.VARIANTS.status).toBe('LIVE')
    expect(MODULE_REGISTRY.BATCHES.status).toBe('LIVE')
  })
})
