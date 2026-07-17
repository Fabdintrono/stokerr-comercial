export type ModuleKey = 'FINANCE' | 'BI' | 'CRM' | 'RESTAURANT' | 'WHOLESALE' | 'VARIANTS' | 'BATCHES'

export type ModuleStatus = 'LIVE' | 'COMING_SOON'

export interface ModuleDef {
  key: ModuleKey
  label: string
  description: string
  routes: string[]
  status: ModuleStatus
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  FINANCE:    { key: 'FINANCE',    label: 'Finanzas',       description: 'Contabilidad, gastos, flujo de caja', routes: ['/finance'],       status: 'LIVE' },
  BI:         { key: 'BI',         label: 'BI / Analytics', description: 'Dashboards y reportes avanzados',      routes: ['/analytics-pro'], status: 'LIVE' },
  CRM:        { key: 'CRM',         label: 'CRM',            description: 'Clientes, seguimiento, campañas',      routes: ['/crm'],           status: 'LIVE' },
  RESTAURANT: { key: 'RESTAURANT', label: 'Restaurante',    description: 'Mesas, recetas, cocina, reposición local↔almacén', routes: ['/restaurant', '/cocina', '/mesa', '/waiter'], status: 'LIVE' },
  WHOLESALE:  { key: 'WHOLESALE',  label: 'Mayorista',      description: 'Listas de precios, crédito, cuentas por cobrar', routes: [], status: 'COMING_SOON' },
  VARIANTS:   { key: 'VARIANTS',   label: 'Variantes',      description: 'Talla/color/modelo/SKU por producto',  routes: [], status: 'COMING_SOON' },
  BATCHES:    { key: 'BATCHES',    label: 'Lotes y vencimiento', description: 'Lotes, fechas de vencimiento, presentaciones', routes: [], status: 'COMING_SOON' },
}

export const MODULE_KEYS = Object.keys(MODULE_REGISTRY) as ModuleKey[]
