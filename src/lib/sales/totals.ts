import Decimal from 'decimal.js'

export interface SaleLineInput { quantity: number | string; unitPrice: number | string; vatRate?: number | string }
export interface SaleTotals { subtotal: Decimal; tax: Decimal; total: Decimal }

export function computeTotals(lines: SaleLineInput[], taxEnabled: boolean, defaultRate: number | string): SaleTotals {
  let subtotal = new Decimal(0)
  let tax = new Decimal(0)
  for (const l of lines) {
    const lineSub = new Decimal(l.quantity).mul(l.unitPrice)
    subtotal = subtotal.plus(lineSub)
    if (taxEnabled) {
      const rate = l.vatRate !== undefined && l.vatRate !== null ? new Decimal(l.vatRate) : new Decimal(defaultRate)
      tax = tax.plus(lineSub.mul(rate).div(100))
    }
  }
  return { subtotal, tax, total: subtotal.plus(tax) }
}
