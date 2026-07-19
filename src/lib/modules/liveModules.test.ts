import { describe, it, expect } from 'vitest'
import { liveModules } from './liveModules'

describe('liveModules', () => {
  it('keeps only LIVE-status modules', () => {
    const enabled = new Set(['RESTAURANT', 'VARIANTS', 'BATCHES'])
    const catalog = [
      { key: 'RESTAURANT', status: 'LIVE' },
      { key: 'VARIANTS', status: 'LIVE' },
      { key: 'BATCHES', status: 'COMING_SOON' },
    ]
    expect(liveModules(enabled as any, catalog as any)).toEqual(new Set(['RESTAURANT', 'VARIANTS']))
  })
  it('drops enabled keys not present in catalog', () => {
    expect(liveModules(new Set(['X']) as any, [] as any)).toEqual(new Set())
  })
})
