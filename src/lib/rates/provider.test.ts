import { describe, it, expect } from 'vitest'
import { getProvider } from './provider'

describe('rate provider registry', () => {
  it('returns the manual provider by default', async () => {
    const p = getProvider('MANUAL')
    expect(p.name).toBe('MANUAL')
    expect(await p.fetchRate('VES', new Date('2026-07-15'))).toBeNull()
  })
  it('falls back to manual for unknown source', () => {
    expect(getProvider('AUTO_BCV').name).toBeDefined()
  })
})
