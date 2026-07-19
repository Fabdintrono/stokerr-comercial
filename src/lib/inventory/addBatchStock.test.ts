import { describe, it, expect } from 'vitest'
import { addBatchStock } from './addBatchStock'

function makeTx(existing: any = null) {
  const calls: any[] = []
  return {
    calls,
    batchInventory: {
      findUnique: async () => existing,
      create: async (a: any) => { calls.push(['bi.create', a]); return { id: 'bi1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['bi.update', a]); return { id: 'bi1', quantity: a.data.quantity } },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('addBatchStock', () => {
  it('creates BatchInventory + movement when none exists', async () => {
    const tx = makeTx()
    await addBatchStock(tx as any, { batchId: 'b1', productId: 'p1', locationId: 'l1', delta: 6, type: 'IN', userId: 'u1' })
    expect(tx.calls[0]).toEqual(['bi.create', expect.objectContaining({ data: expect.objectContaining({ batchId: 'b1', locationId: 'l1', quantity: 6 }) })])
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data).toMatchObject({ productId: 'p1', batchId: 'b1', locationId: 'l1', quantity: 6, type: 'IN' })
  })
  it('adds delta to an existing BatchInventory row', async () => {
    const tx = makeTx({ id: 'bi1', quantity: 4 })
    await addBatchStock(tx as any, { batchId: 'b1', productId: 'p1', locationId: 'l1', delta: 2, type: 'IN', userId: 'u1' })
    const upd = tx.calls.find(c => c[0] === 'bi.update')[1]
    expect(upd.data.quantity).toBe(6)
  })
})
