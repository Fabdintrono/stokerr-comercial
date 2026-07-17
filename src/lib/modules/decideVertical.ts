import type { BusinessVertical } from './verticals'

export function decideVertical(locations: { type: string }[]): BusinessVertical {
  return locations.some(l => l.type === 'RESTAURANT') ? 'RESTAURANT' : 'RETAIL'
}
