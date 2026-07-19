import type { ModuleKey } from './registry'

export function liveModules(
  enabled: Set<ModuleKey>,
  catalog: { key: ModuleKey; status: 'LIVE' | 'COMING_SOON' }[],
): Set<ModuleKey> {
  const liveKeys = new Set(catalog.filter(m => m.status === 'LIVE').map(m => m.key))
  return new Set([...enabled].filter(k => liveKeys.has(k)))
}
