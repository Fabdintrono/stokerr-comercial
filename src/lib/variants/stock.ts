export function stockForProduct(
  product: { hasVariants: boolean; hasBatches?: boolean },
  inventory: { quantity: number }[],
  variantInventory: { quantity: number }[],
  batchInventory: { quantity: number }[] = [],
): number {
  const rows = product.hasBatches ? batchInventory : product.hasVariants ? variantInventory : inventory
  return rows.reduce((sum, r) => sum + r.quantity, 0)
}
