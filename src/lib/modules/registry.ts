export type ModuleKey = 'FINANCE' | 'BI' | 'CRM'

export interface ModuleDef {
  key: ModuleKey
  label: string
  description: string
  routes: string[]
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  FINANCE: { key: 'FINANCE', label: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja', routes: ['/finance'] },
  BI:      { key: 'BI',      label: 'BI / Analytics', description: 'Dashboards y reportes avanzados', routes: ['/analytics-pro'] },
  CRM:     { key: 'CRM',     label: 'CRM', description: 'Clientes, seguimiento, campañas', routes: ['/crm'] },
}

export const MODULE_KEYS = Object.keys(MODULE_REGISTRY) as ModuleKey[]
