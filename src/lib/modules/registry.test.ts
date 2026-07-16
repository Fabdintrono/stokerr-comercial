import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, MODULE_KEYS } from './registry'

describe('module registry', () => {
  it('defines FINANCE, BI, CRM', () => {
    expect(MODULE_KEYS.sort()).toEqual(['BI', 'CRM', 'FINANCE'])
  })
  it('each module has a label and at least one route', () => {
    for (const k of MODULE_KEYS) {
      expect(MODULE_REGISTRY[k].label.length).toBeGreaterThan(0)
      expect(MODULE_REGISTRY[k].routes.length).toBeGreaterThan(0)
    }
  })
})
