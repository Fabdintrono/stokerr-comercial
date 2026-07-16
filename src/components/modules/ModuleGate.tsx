'use client'
import type { ModuleKey } from '@/lib/modules/registry'
import { useModules } from './ModulesProvider'

export function ModuleGate({ module, children }: { module: ModuleKey; children: React.ReactNode }) {
  const { has, loading } = useModules()
  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>
  if (!has(module)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Módulo no activo</h2>
        <p className="text-muted-foreground">Este módulo no está incluido en tu plan. Contáctanos para activarlo.</p>
      </div>
    )
  }
  return <>{children}</>
}
