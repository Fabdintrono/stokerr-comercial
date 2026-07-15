import Decimal from 'decimal.js'
import { CurrencyCode } from '@/lib/currency'
import { manualProvider } from './manualProvider'

export interface RateProvider {
  name: string
  /** Returns base-relative rate for `currency` on `date`, or null if unavailable. */
  fetchRate(currency: CurrencyCode, date: Date): Promise<Decimal | null>
}

const REGISTRY: Record<string, RateProvider> = {
  MANUAL: manualProvider,
}

export function getProvider(source: string): RateProvider {
  return REGISTRY[source] ?? manualProvider
}
