import Decimal from 'decimal.js'

export function computeMonthlyAmount(planPrice: Decimal | string | number, addonPrices: (Decimal | string | number)[]): Decimal {
  let total = new Decimal(planPrice)
  for (const p of addonPrices) total = total.plus(new Decimal(p))
  return total
}
