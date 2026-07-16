import { Plan } from '@prisma/client'
import { ModuleKey } from './registry'

export interface CatalogEntry { key: ModuleKey; active: boolean; includedInPlans: Plan[] }
export interface TenantOverride { moduleKey: ModuleKey; enabled: boolean }

export function effectiveModules(
  plan: Plan,
  catalog: CatalogEntry[],
  overrides: TenantOverride[],
): Set<ModuleKey> {
  const result = new Set<ModuleKey>()
  const overrideMap = new Map(overrides.map(o => [o.moduleKey, o.enabled]))
  for (const m of catalog) {
    if (!m.active) continue
    const includedByPlan = m.includedInPlans.includes(plan)
    const override = overrideMap.get(m.key)
    const on = override !== undefined ? override : includedByPlan
    if (on) result.add(m.key)
  }
  return result
}
