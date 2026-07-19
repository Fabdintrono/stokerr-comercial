import { pickBatchesFEFO, type FefoBatch } from '@/lib/batches/fefo'

type TxLike = any
export interface DeductFEFOArgs {
  productId: string
  locationId: string
  quantity: number
  userId: string
  today: Date
  allowExpired: boolean
  type: 'OUT' | 'TRANSFER'
  reason?: string
}

export async function deductBatchesFEFO(tx: TxLike, args: DeductFEFOArgs): Promise<void> {
  const rows = await tx.batchInventory.findMany({
    where: { locationId: args.locationId, quantity: { gt: 0 }, batch: { productId: args.productId } },
    select: { id: true, quantity: true, batchId: true, batch: { select: { expiryDate: true } } },
  })
  const fefoInput: (FefoBatch & { rowId: string })[] = rows.map((r: any) => ({
    id: r.batchId, rowId: r.id, quantity: r.quantity, expiryDate: r.batch.expiryDate,
  }))
  const picks = pickBatchesFEFO(fefoInput, args.quantity, { today: args.today, allowExpired: args.allowExpired })
  for (const pick of picks) {
    const row = fefoInput.find(r => r.id === pick.id)!
    await tx.batchInventory.update({ where: { id: row.rowId }, data: { quantity: row.quantity - pick.take } })
    await tx.inventoryMovement.create({
      data: { productId: args.productId, batchId: pick.id, locationId: args.locationId, userId: args.userId, type: args.type, quantity: pick.take, reason: args.reason ?? null },
    })
  }
}
