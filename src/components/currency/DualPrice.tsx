'use client'
import Decimal from 'decimal.js'
import { CurrencyCode, formatMoney, convert } from '@/lib/currency'

interface Props {
  amount: number | string
  anchor: CurrencyCode
  secondary?: CurrencyCode | null
  rates: Record<CurrencyCode, Decimal>
  className?: string
}

export function DualPrice({ amount, anchor, secondary, rates, className }: Props) {
  const value = new Decimal(amount)
  const primary = formatMoney(value, anchor)
  const sec = secondary && secondary !== anchor
    ? formatMoney(convert(value, anchor, secondary, rates), secondary)
    : null
  return (
    <span className={className}>
      <span className="font-medium text-foreground">{primary}</span>
      {sec && <span className="ml-2 text-sm text-muted-foreground">{sec}</span>}
    </span>
  )
}
