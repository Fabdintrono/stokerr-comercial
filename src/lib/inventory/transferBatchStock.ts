import { pickBatchesFEFO, type FefoBatch } from '@/lib/batches/fefo'

type TxLike = any
export interface TransferBatchArgs {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  userId: string
  today: Date
}

// Moves batch stock between locations preserving lot identity. Uses FEFO at source
// (allowExpired: true — moving expired stock between warehouses is valid, it's not a sale).
export async function transferBatchStock(tx: TxLike, args: TransferBatchArgs): Promise<void> {
  const rows = await tx.batchInventory.findMany({
    where: { locationId: args.fromLocationId, quantity: { gt: 0 }, batch: { productId: args.productId } },
    select: { id: true, quantity: true, batchId: true, batch: { select: { expiryDate: true } } },
  })
  const input: (FefoBatch & { rowId: string })[] = rows.map((r: any) => ({ id: r.batchId, rowId: r.id, quantity: r.quantity, expiryDate: r.batch.expiryDate }))
  const picks = pickBatchesFEFO(input, args.quantity, { today: args.today, allowExpired: true })
  for (const pick of picks) {
    const row = input.find(r => r.id === pick.id)!
    // deduct at source
    await tx.batchInventory.update({ where: { id: row.rowId }, data: { quantity: row.quantity - pick.take } })
    await tx.inventoryMovement.create({ data: { productId: args.productId, batchId: pick.id, locationId: args.fromLocationId, userId: args.userId, type: 'TRANSFER', quantity: pick.take } })
    // add at destination (same batch)
    const dest = await tx.batchInventory.findUnique({ where: { batchId_locationId: { batchId: pick.id, locationId: args.toLocationId } } })
    if (dest) await tx.batchInventory.update({ where: { id: dest.id }, data: { quantity: dest.quantity + pick.take } })
    else await tx.batchInventory.create({ data: { batchId: pick.id, locationId: args.toLocationId, quantity: pick.take } })
    await tx.inventoryMovement.create({ data: { productId: args.productId, batchId: pick.id, locationId: args.toLocationId, userId: args.userId, type: 'IN', quantity: pick.take } })
  }
}
