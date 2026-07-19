type TxLike = any // Prisma tx client; typed loosely to keep the helper simple

export interface AdjustStockArgs {
  productId: string
  variantId?: string | null
  locationId: string
  delta: number
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  userId: string
  reason?: string
}

export async function adjustStock(tx: TxLike, args: AdjustStockArgs): Promise<void> {
  const { productId, variantId, locationId, delta, type, userId, reason } = args
  let inventoryId: string | null = null

  if (variantId) {
    const existing = await tx.variantInventory.findUnique({ where: { variantId_locationId: { variantId, locationId } } })
    if (existing) {
      await tx.variantInventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
    } else {
      await tx.variantInventory.create({ data: { variantId, locationId, quantity: delta } })
    }
  } else {
    const existing = await tx.inventory.findUnique({ where: { productId_locationId: { productId, locationId } } })
    if (existing) {
      inventoryId = existing.id
      await tx.inventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
    } else {
      const created = await tx.inventory.create({ data: { productId, locationId, quantity: delta } })
      inventoryId = created.id
    }
  }

  await tx.inventoryMovement.create({
    data: {
      productId,
      variantId: variantId ?? null,
      locationId,
      userId,
      type,
      quantity: Math.abs(delta),
      reason: reason ?? null,
      inventoryId,
    },
  })
}
