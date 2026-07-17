import type { ModuleKey } from './registry'

export type BusinessVertical = 'RESTAURANT' | 'FASTFOOD' | 'WHOLESALE' | 'HARDWARE' | 'PHARMACY' | 'RETAIL'

export const VERTICALS: BusinessVertical[] = ['RESTAURANT', 'FASTFOOD', 'WHOLESALE', 'HARDWARE', 'PHARMACY', 'RETAIL']

export const VERTICAL_PRESETS: Record<BusinessVertical, ModuleKey[]> = {
  RESTAURANT: ['RESTAURANT'],
  FASTFOOD:   ['RESTAURANT', 'BATCHES'],
  WHOLESALE:  ['WHOLESALE'],
  HARDWARE:   ['VARIANTS'],
  PHARMACY:   ['BATCHES', 'VARIANTS'],
  RETAIL:     [],
}

export function presetModules(vertical: BusinessVertical): ModuleKey[] {
  return VERTICAL_PRESETS[vertical]
}
