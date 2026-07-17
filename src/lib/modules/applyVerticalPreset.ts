import { presetModules, type BusinessVertical } from './verticals'

type TxLike = {
  tenantModule: {
    upsert: (args: {
      where: { businessId_moduleKey: { businessId: string; moduleKey: string } }
      update: { enabled: boolean }
      create: { businessId: string; moduleKey: string; enabled: boolean; source: 'PLAN'; priceAtActivation: number }
    }) => Promise<unknown>
  }
}

// Activa (crea o enciende) los TenantModule del preset del vertical. Aditivo e idempotente.
export async function applyVerticalPreset(tx: TxLike, businessId: string, vertical: BusinessVertical): Promise<string[]> {
  const keys = presetModules(vertical)
  for (const moduleKey of keys) {
    await tx.tenantModule.upsert({
      where: { businessId_moduleKey: { businessId, moduleKey } },
      update: { enabled: true },
      create: { businessId, moduleKey, enabled: true, source: 'PLAN', priceAtActivation: 0 },
    })
  }
  return keys
}
