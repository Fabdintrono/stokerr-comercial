import { describe, it, expect, vi } from 'vitest'
import { getEnabledModules, ModuleForbiddenError, requireModule } from './guard'

function fakePrisma(plan: string, catalog: any[], overrides: any[]) {
  return {
    business: { findUnique: vi.fn().mockResolvedValue({ plan }) },
    module: { findMany: vi.fn().mockResolvedValue(catalog) },
    tenantModule: { findMany: vi.fn().mockResolvedValue(overrides) },
  } as any
}

describe('getEnabledModules', () => {
  it('resolves plan + overrides into a set', async () => {
    const prisma = fakePrisma('STARTER',
      [{ key: 'CRM', active: true, includedInPlans: [] }],
      [{ moduleKey: 'CRM', enabled: true }])
    expect((await getEnabledModules(prisma, 'biz_1')).has('CRM')).toBe(true)
  })
})

describe('requireModule', () => {
  it('throws ModuleForbiddenError when module not enabled', async () => {
    const prisma = fakePrisma('STARTER', [{ key: 'CRM', active: true, includedInPlans: [] }], [])
    await expect(requireModule(prisma, 'biz_1', 'CRM')).rejects.toBeInstanceOf(ModuleForbiddenError)
  })
  it('resolves when module enabled', async () => {
    const prisma = fakePrisma('STARTER',
      [{ key: 'CRM', active: true, includedInPlans: [] }],
      [{ moduleKey: 'CRM', enabled: true }])
    await expect(requireModule(prisma, 'biz_1', 'CRM')).resolves.toBeUndefined()
  })
})
