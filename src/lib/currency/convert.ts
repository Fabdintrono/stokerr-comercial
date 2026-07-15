import Decimal from 'decimal.js'
import { CurrencyCode, CURRENCY_META } from './currencies'

type Rates = Record<CurrencyCode, Decimal>

/** Convert `amount` from currency `from` to `to` using base-relative rates. */
export function convert(amount: Decimal, from: CurrencyCode, to: CurrencyCode, rates: Rates): Decimal {
  if (from === to) return amount
  const inBase = amount.mul(rates[from])
  return inBase.div(rates[to])
}

/** Format with the currency's decimals + symbol. */
export function formatMoney(amount: Decimal, currency: CurrencyCode): string {
  const { symbol, decimals } = CURRENCY_META[currency]
  const rounded = amount.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)

  // Build number string manually to avoid locale-specific separators and non-breaking spaces
  const absStr = rounded.abs().toFixed(decimals)

  const separator = symbol === 'Bs' || symbol === 'R$' ? ' ' : ''
  return `${symbol}${separator}${absStr}`
}
