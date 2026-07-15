import Decimal from 'decimal.js'
import { CurrencyCode, convert, formatMoney } from '@/lib/currency'

export function dualLabel(
  amount: Decimal,
  anchor: CurrencyCode,
  secondary: CurrencyCode | null,
  rates: Record<CurrencyCode, Decimal>,
): string {
  const primary = formatMoney(amount, anchor)
  if (!secondary || secondary === anchor) return primary
  const sec = formatMoney(convert(amount, anchor, secondary, rates), secondary)
  return `${primary} / ${sec}`
}
