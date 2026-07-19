import { describe, it, expect, vi } from 'vitest'
import { issueDocument } from './issue'

function makePrisma(order: any) {
  const tx = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...order, ...data })),
    },
    business: {
      findUnique: vi.fn().mockResolvedValue({ docPrefix: 'F-', docNextNumber: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
    recipe: {
      findFirst: vi.fn().mockResolvedValue(null), // no recipe by default
    },
    inventory: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'inv1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    inventoryMovement: {
      create: vi.fn().mockResolvedValue({}),
    },
  }
  return { $transaction: (fn: any) => fn(tx), _tx: tx } as any
}

const baseOrder = {
  id: 'o1',
  docNumber: null,
  issuedAt: null,
  userId: 'u1',
  locationId: 'loc1',
  location: { businessId: 'b1' },
  items: [{ productId: 'p1', variantId: null, quantity: 2 }],
}

describe('issueDocument', () => {
  it('assigns the tenant next number formatted with prefix', async () => {
    const prisma = makePrisma({ ...baseOrder })
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000001')
    expect(prisma._tx.business.update).toHaveBeenCalled()
  })

  it('is idempotent: an already-issued order keeps its number', async () => {
    const prisma = makePrisma({
      ...baseOrder,
      docNumber: 'F-000005',
      issuedAt: new Date('2026-01-01'),
    })
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000005')
    expect(prisma._tx.business.update).not.toHaveBeenCalled()
  })

  it('decrements stock for non-recipe products on first issuance', async () => {
    const prisma = makePrisma({ ...baseOrder })
    await issueDocument(prisma, 'o1')
    expect(prisma._tx.inventoryMovement.create).toHaveBeenCalledOnce()
    const call = prisma._tx.inventoryMovement.create.mock.calls[0][0]
    expect(call.data.type).toBe('OUT')
    expect(call.data.productId).toBe('p1')
    expect(call.data.quantity).toBe(2)
  })

  it('skips stock decrement for recipe-based products', async () => {
    const prisma = makePrisma({ ...baseOrder })
    prisma._tx.recipe.findFirst = vi.fn().mockResolvedValue({ id: 'r1', productId: 'p1' })
    await issueDocument(prisma, 'o1')
    expect(prisma._tx.inventoryMovement.create).not.toHaveBeenCalled()
  })

  it('does not decrement stock on re-issuance (idempotent)', async () => {
    const prisma = makePrisma({
      ...baseOrder,
      docNumber: 'F-000005',
      issuedAt: new Date('2026-01-01'),
    })
    await issueDocument(prisma, 'o1')
    expect(prisma._tx.inventoryMovement.create).not.toHaveBeenCalled()
  })
})
