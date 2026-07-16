import { describe, it, expect } from 'vitest'
import { effectiveModules } from './effectiveModules'

const catalog = [
  { key: 'FINANCE' as const, active: true, includedInPlans: ['ENTERPRISE' as const] },
  { key: 'BI' as const, active: true, includedInPlans: [] },
  { key: 'CRM' as const, active: false, includedInPlans: ['ENTERPRISE' as const] },
]

describe('effectiveModules', () => {
  it('includes a module bundled by the plan', () => {
    expect(effectiveModules('ENTERPRISE', catalog, []).has('FINANCE')).toBe(true)
  })
  it('excludes a plan-bundled module when globally inactive', () => {
    expect(effectiveModules('ENTERPRISE', catalog, []).has('CRM')).toBe(false)
  })
  it('enables an add-on via override even if plan does not include it', () => {
    expect(effectiveModules('STARTER', catalog, [{ moduleKey: 'BI', enabled: true }]).has('BI')).toBe(true)
  })
  it('disables a plan-included module via override off', () => {
    expect(effectiveModules('ENTERPRISE', catalog, [{ moduleKey: 'FINANCE', enabled: false }]).has('FINANCE')).toBe(false)
  })
  it('a basic plan with no overrides has no premium modules', () => {
    expect(effectiveModules('STARTER', catalog, []).size).toBe(0)
  })
})
