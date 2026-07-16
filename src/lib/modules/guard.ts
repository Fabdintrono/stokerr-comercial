import type { PrismaClient } from '@prisma/client'
import { ModuleKey } from './registry'
import { effectiveModules, CatalogEntry, TenantOverride } from './effectiveModules'

export class ModuleForbiddenError extends Error {
  constructor(public moduleKey: string) {
    super(`module ${moduleKey} not enabled for tenant`)
    this.name = 'ModuleForbiddenError'
  }
}

export async function getEnabledModules(prisma: PrismaClient, businessId: string): Promise<Set<ModuleKey>> {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { plan: true } })
  if (!business) return new Set()
  const catalog = await prisma.module.findMany({ select: { key: true, active: true, includedInPlans: true } })
  const overrides = await prisma.tenantModule.findMany({ where: { businessId }, select: { moduleKey: true, enabled: true } })
  return effectiveModules(business.plan, catalog as unknown as CatalogEntry[], overrides as unknown as TenantOverride[])
}

export async function requireModule(prisma: PrismaClient, businessId: string, key: ModuleKey): Promise<void> {
  const set = await getEnabledModules(prisma, businessId)
  if (!set.has(key)) throw new ModuleForbiddenError(key)
}
