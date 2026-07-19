type TxLike = any
export interface AddBatchStockArgs {
  batchId: string
  productId: string
  locationId: string
  delta: number
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  userId: string
  reason?: string
}

export async function addBatchStock(tx: TxLike, args: AddBatchStockArgs): Promise<void> {
  const { batchId, productId, locationId, delta, type, userId, reason } = args
  const existing = await tx.batchInventory.findUnique({ where: { batchId_locationId: { batchId, locationId } } })
  if (existing) {
    await tx.batchInventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
  } else {
    await tx.batchInventory.create({ data: { batchId, locationId, quantity: delta } })
  }
  await tx.inventoryMovement.create({
    data: { productId, batchId, locationId, userId, type, quantity: Math.abs(delta), reason: reason ?? null },
  })
}
