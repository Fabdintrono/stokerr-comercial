import { describe, it, expect } from 'vitest'
import { adjustStock } from './adjustStock'

function makeTx(existing: { variant?: any; simple?: any } = {}) {
  const calls: any[] = []
  return {
    calls,
    variantInventory: {
      findUnique: async () => existing.variant ?? null,
      create: async (a: any) => { calls.push(['vi.create', a]); return { id: 'vi1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['vi.update', a]); return { id: 'vi1', quantity: a.data.quantity } },
    },
    inventory: {
      findUnique: async () => existing.simple ?? null,
      create: async (a: any) => { calls.push(['inv.create', a]); return { id: 'inv1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['inv.update', a]); return { id: 'inv1', quantity: a.data.quantity } },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('adjustStock', () => {
  it('routes to VariantInventory when variantId present, creating the row and a movement', async () => {
    const tx = makeTx()
    await adjustStock(tx as any, { productId: 'p1', variantId: 'v1', locationId: 'l1', delta: 3, type: 'IN', userId: 'u1' })
    expect(tx.calls[0]).toEqual(['vi.create', expect.objectContaining({ data: expect.objectContaining({ variantId: 'v1', locationId: 'l1', quantity: 3 }) })])
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data).toMatchObject({ productId: 'p1', variantId: 'v1', locationId: 'l1', quantity: 3, type: 'IN' })
  })
  it('adds delta to an existing VariantInventory row', async () => {
    const tx = makeTx({ variant: { id: 'vi1', quantity: 5 } })
    await adjustStock(tx as any, { productId: 'p1', variantId: 'v1', locationId: 'l1', delta: -2, type: 'OUT', userId: 'u1' })
    const upd = tx.calls.find(c => c[0] === 'vi.update')[1]
    expect(upd.data.quantity).toBe(3)
  })
  it('routes to Inventory when no variantId (simple product)', async () => {
    const tx = makeTx()
    await adjustStock(tx as any, { productId: 'p1', locationId: 'l1', delta: 4, type: 'IN', userId: 'u1' })
    expect(tx.calls[0][0]).toBe('inv.create')
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data.variantId ?? null).toBeNull()
  })
})
