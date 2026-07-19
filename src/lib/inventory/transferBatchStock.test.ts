import { describe, it, expect } from 'vitest'
import { transferBatchStock } from './transferBatchStock'

const today = new Date('2026-07-19')
function makeTx(fromRows: any[]) {
  const calls: any[] = []
  const toRows: Record<string, any> = {}
  return {
    calls,
    batchInventory: {
      findMany: async () => fromRows, // rows at fromLocation
      update: async (a: any) => { calls.push(['bi.update', a]); return a },
      findUnique: async (a: any) => toRows[a.where.batchId_locationId.batchId] ?? null,
      create: async (a: any) => { calls.push(['bi.create', a]); return { id: 'new', quantity: a.data.quantity } },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('transferBatchStock', () => {
  it('FEFO-picks from source and increments same batch at destination, preserving batchId', async () => {
    const fromRows = [
      { id: 'f1', quantity: 4, batchId: 'b1', batch: { expiryDate: new Date('2026-08-01') } },
      { id: 'f2', quantity: 10, batchId: 'b2', batch: { expiryDate: new Date('2026-09-01') } },
    ]
    const tx = makeTx(fromRows)
    await transferBatchStock(tx as any, { productId: 'p1', fromLocationId: 'A', toLocationId: 'B', quantity: 6, userId: 'u1', today })
    // source: b1 -4 → 0, b2 -2 → 8
    const srcUpdates = tx.calls.filter(c => c[0] === 'bi.update').map(c => c[1].data.quantity)
    expect(srcUpdates).toContain(0)
    expect(srcUpdates).toContain(8)
    // destination: creates b1 (+4) and b2 (+2) at location B
    const created = tx.calls.filter(c => c[0] === 'bi.create').map(c => ({ batchId: c[1].data.batchId, q: c[1].data.quantity, loc: c[1].data.locationId }))
    expect(created).toEqual([{ batchId: 'b1', q: 4, loc: 'B' }, { batchId: 'b2', q: 2, loc: 'B' }])
  })
})
