type PriceLike = { salePrice?: string | null }
type CostLike = { costPrice?: string | null }

export function effectivePrice(variant: PriceLike, product: { salePrice: string }): string {
  return variant.salePrice != null ? variant.salePrice : product.salePrice
}

export function effectiveCost(variant: CostLike, product: { costPrice: string }): string {
  return variant.costPrice != null ? variant.costPrice : product.costPrice
}
