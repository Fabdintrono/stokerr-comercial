import Decimal from 'decimal.js'
import { CurrencyCode } from '@/lib/currency'

/** Loads the latest rate on/before `date` for a currency, or null. */
export type RateLoader = (currency: CurrencyCode, date: Date) => Promise<Decimal | null>

/** Base-relative effective rate for `currency`, with carry-forward. Base === 1. */
export async function effectiveRate(
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  date: Date,
  load: RateLoader,
): Promise<Decimal> {
  if (currency === baseCurrency) return new Decimal(1)
  const rate = await load(currency, date)
  if (!rate) throw new Error(`no rate available for ${currency} on ${date.toISOString()}`)
  return rate
}
