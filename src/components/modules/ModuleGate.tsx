'use client'
import type { ModuleKey } from '@/lib/modules/registry'
import { useModules } from './ModulesProvider'
import { useI18n } from '@/lib/i18n'

export function ModuleGate({ module, children }: { module: ModuleKey; children: React.ReactNode }) {
  const { has, loading } = useModules()
  const { t } = useI18n()
  if (loading) return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>
  if (!has(module)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{t('modules.notActive')}</h2>
        <p className="text-muted-foreground">{t('modules.notActiveDesc')}</p>
      </div>
    )
  }
  return <>{children}</>
}
