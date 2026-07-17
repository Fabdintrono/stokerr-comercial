// src/lib/modules/applyVerticalPreset.test.ts
import { describe, it, expect } from 'vitest'
import { applyVerticalPreset } from './applyVerticalPreset'

function makeTx() {
  const calls: any[] = []
  return {
    calls,
    tenantModule: { upsert: async (args: any) => { calls.push(args); return args } },
  }
}

describe('applyVerticalPreset', () => {
  it('upserts one TenantModule per preset module (HARDWARE → VARIANTS)', async () => {
    const tx = makeTx()
    const keys = await applyVerticalPreset(tx as any, 'biz1', 'HARDWARE')
    expect(keys).toEqual(['VARIANTS'])
    expect(tx.calls).toHaveLength(1)
    expect(tx.calls[0].where).toEqual({ businessId_moduleKey: { businessId: 'biz1', moduleKey: 'VARIANTS' } })
    expect(tx.calls[0].create).toMatchObject({ businessId: 'biz1', moduleKey: 'VARIANTS', enabled: true, source: 'PLAN' })
    expect(tx.calls[0].update).toEqual({ enabled: true })
  })
  it('RETAIL creates no TenantModule', async () => {
    const tx = makeTx()
    const keys = await applyVerticalPreset(tx as any, 'biz2', 'RETAIL')
    expect(keys).toEqual([])
    expect(tx.calls).toHaveLength(0)
  })
  it('FASTFOOD upserts RESTAURANT and BATCHES', async () => {
    const tx = makeTx()
    await applyVerticalPreset(tx as any, 'biz3', 'FASTFOOD')
    expect(tx.calls.map(c => c.create.moduleKey)).toEqual(['RESTAURANT', 'BATCHES'])
  })
})
