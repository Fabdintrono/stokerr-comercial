import { describe, it, expect } from 'vitest'
import { stockForProduct } from './stock'

describe('stockForProduct', () => {
  it('sums VariantInventory quantities for a product with variants', () => {
    const product = { hasVariants: true }
    const variantInv = [{ quantity: 3 }, { quantity: 5 }]
    expect(stockForProduct(product, [], variantInv)).toBe(8)
  })
  it('uses Inventory quantity for a simple product', () => {
    const product = { hasVariants: false }
    const inv = [{ quantity: 7 }]
    expect(stockForProduct(product, inv, [])).toBe(7)
  })
  it('returns 0 when no rows', () => {
    expect(stockForProduct({ hasVariants: false }, [], [])).toBe(0)
    expect(stockForProduct({ hasVariants: true }, [], [])).toBe(0)
  })
  it('sums BatchInventory for a product with batches', () => {
    const product = { hasVariants: false, hasBatches: true }
    expect(stockForProduct(product, [], [], [{ quantity: 4 }, { quantity: 6 }])).toBe(10)
  })
})
