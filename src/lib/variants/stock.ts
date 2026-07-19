export function stockForProduct(
  product: { hasVariants: boolean },
  inventory: { quantity: number }[],
  variantInventory: { quantity: number }[],
): number {
  const rows = product.hasVariants ? variantInventory : inventory
  return rows.reduce((sum, r) => sum + r.quantity, 0)
}
