import { describe, it, expect } from 'vitest'
import { deductBatchesFEFO } from './deductBatchesFEFO'

const today = new Date('2026-07-19')
function makeTx(rows: any[]) {
  const calls: any[] = []
  return {
    calls,
    batchInventory: {
      findMany: async () => rows,
      update: async (a: any) => { calls.push(['bi.update', a]); return a },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('deductBatchesFEFO', () => {
  it('deducts from earliest-expiry non-expired batches, one movement per batch', async () => {
    const rows = [
      { id: 'bi1', quantity: 5, batchId: 'b1', batch: { expiryDate: new Date('2026-08-01') } },
      { id: 'bi2', quantity: 10, batchId: 'b2', batch: { expiryDate: new Date('2026-09-01') } },
    ]
    const tx = makeTx(rows)
    await deductBatchesFEFO(tx as any, { productId: 'p1', locationId: 'l1', quantity: 8, userId: 'u1', today, allowExpired: false, type: 'OUT' })
    const updates = tx.calls.filter(c => c[0] === 'bi.update').map(c => c[1].data.quantity)
    expect(updates).toEqual([0, 7])
    const movements = tx.calls.filter(c => c[0] === 'mv.create').map(c => c[1].data.batchId)
    expect(movements).toEqual(['b1', 'b2'])
  })
  it('throws when non-expired stock is insufficient (allowExpired false)', async () => {
    const rows = [{ id: 'bi1', quantity: 2, batchId: 'b1', batch: { expiryDate: new Date('2026-07-01') } }]
    const tx = makeTx(rows)
    await expect(deductBatchesFEFO(tx as any, { productId: 'p1', locationId: 'l1', quantity: 1, userId: 'u1', today, allowExpired: false, type: 'OUT' })).rejects.toThrow(/insufficient/i)
  })
})
